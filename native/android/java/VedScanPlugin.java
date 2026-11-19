package com.vedant.vedverse;

import android.Manifest;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Point;
import android.graphics.Rect;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.CaptureResult;
import android.hardware.camera2.TotalCaptureResult;
import android.media.Image;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.util.Size;
import android.view.HapticFeedbackConstants;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.camera.camera2.interop.Camera2Interop;
import androidx.camera.camera2.interop.ExperimentalCamera2Interop;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ExperimentalGetImage;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.MeteringPoint;
import androidx.camera.core.Preview;
import androidx.camera.core.ZoomState;
import androidx.camera.core.resolutionselector.AspectRatioStrategy;
import androidx.camera.core.resolutionselector.ResolutionSelector;
import androidx.camera.core.resolutionselector.ResolutionStrategy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.LifecycleOwner;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.ZoomSuggestionOptions;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * VedScan — Vedverse's own QR engine: CameraX + Google ML Kit (bundled model, no download).
 *
 * Why it's fast:
 *  - CameraX is initialised when the app loads, and prepare() opens the camera the instant a finger
 *    touches a scan button, so the stream is usually live before the tap even finishes.
 *  - Launched from the Quick Settings tile / widget / shortcut (vedverse://scan) the camera starts in
 *    load(), before the web UI exists; a result found early is retained until JS listens.
 *  - ImageAnalysis keeps only the newest ~720p frame (no queue = no lag) and ML Kit reads the FULL frame.
 *  - ML Kit zoom suggestions auto-zoom on small / far codes; a code that is seen but not yet readable
 *    pulls focus + exposure onto itself; every 3rd frame is scanned colour-inverted for dark-mode QRs.
 *  - Torch 'auto' turns itself on in the dark (frame luminance + sensor ISO x exposure time).
 *  - The haptic fires natively on the decode frame, before the JS round trip.
 *
 * The preview is a PreviewView placed BEHIND the WebView; while scanning the WebView is transparent.
 */
@CapacitorPlugin(name = "VedScan", permissions = { @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera") })
public class VedScanPlugin extends Plugin {
    private static final String TAG = "VedScan";
    private static final int BG = Color.parseColor("#020307");

    private final ExecutorService exec = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private ListenableFuture<ProcessCameraProvider> providerFuture;
    private Camera camera;
    private PreviewView previewView;
    private BarcodeScanner scanner;

    private volatile boolean analyzing = false, autoZoom = true, vibrate = true, bound = false, torchOn = false;
    private volatile String torchMode = "auto";
    private volatile long startedAt = 0, lastFocusAt = 0;
    private volatile int frameNo = 0, darkFrames = 0;
    private volatile float viewW = 0, viewH = 0, exposureScore = 0, minZoom = 1f, maxZoom = 1f;
    private byte[] nv21;

    private static long now() { return SystemClock.elapsedRealtime(); }
    private boolean hasCam() { return getPermissionState("camera") == PermissionState.GRANTED; }

    @Override
    public void load() {
        providerFuture = ProcessCameraProvider.getInstance(getContext());   // init CameraX early (no camera opened yet)
        try {
            Intent i = getActivity().getIntent();
            Uri d = i != null ? i.getData() : null;
            if (d != null && d.toString().startsWith("vedverse://scan") && hasCam()) {
                analyzing = true; startedAt = now();
                bindCamera(null);
            }
        } catch (Exception e) { Log.w(TAG, "launch scan", e); }
    }

    /* ------------------------------------------------------------ JS API */
    @PluginMethod
    public void prepare(PluginCall call) {
        if (!hasCam()) { JSObject o = new JSObject(); o.put("granted", false); call.resolve(o); return; }
        bindCamera(null);
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        main.post(() -> { if (!analyzing) unbind(); });
        call.resolve();
    }

    @PluginMethod
    public void start(PluginCall call) {
        torchMode = call.getString("torch", "auto");
        vibrate = call.getBoolean("vibrate", true);
        autoZoom = call.getBoolean("autoZoom", true);
        if (!hasCam()) { requestPermissionForAlias("camera", call, "camPerm"); return; }
        doStart(call);
    }

    @PermissionCallback
    private void camPerm(PluginCall call) {
        if (hasCam()) doStart(call); else call.reject("Camera permission denied");
    }

    private void doStart(PluginCall call) {
        if (!analyzing) { startedAt = now(); frameNo = 0; darkFrames = 0; }
        analyzing = true;
        main.post(() -> {
            showPreview(true);
            bindCamera(() -> {
                if (camera == null) { showPreview(false); analyzing = false; call.reject("Camera unavailable"); return; }
                if ("on".equals(torchMode)) setTorch(true, false);
                JSObject z = new JSObject(); z.put("min", minZoom); z.put("max", maxZoom);
                JSObject o = new JSObject();
                o.put("torch", camera.getCameraInfo().hasFlashUnit());
                o.put("zoom", z);
                o.put("openMs", now() - startedAt);
                call.resolve(o);
            });
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        analyzing = false;
        main.post(() -> { unbind(); showPreview(false); call.resolve(); });
    }

    @PluginMethod
    public void resume(PluginCall call) { startedAt = now(); analyzing = true; call.resolve(); }

    @PluginMethod
    public void setZoom(PluginCall call) {
        float r = call.getFloat("ratio", 1f);
        if (camera != null) camera.getCameraControl().setZoomRatio(Math.max(minZoom, Math.min(maxZoom, r)));
        call.resolve();
    }

    @PluginMethod
    public void setAutoZoom(PluginCall call) { autoZoom = call.getBoolean("enabled", true); call.resolve(); }

    @PluginMethod
    public void setTorch(PluginCall call) {
        torchMode = call.getString("mode", "auto");
        darkFrames = 0;
        setTorch("on".equals(torchMode), false);
        JSObject o = new JSObject(); o.put("on", torchOn); call.resolve(o);
    }

    @PluginMethod
    public void focus(PluginCall call) {
        float x = call.getFloat("x", 0.5f), y = call.getFloat("y", 0.5f);
        main.post(() -> focusAt(x, y));
        call.resolve();
    }

    /* ------------------------------------------------------------ camera */
    private void ensurePreviewView() {
        if (previewView != null) return;
        previewView = new PreviewView(getContext());
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        previewView.setBackgroundColor(Color.BLACK);
        ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
        parent.addView(previewView, 0, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        previewView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> { viewW = r - l; viewH = b - t; });
    }

    private void showPreview(boolean on) {
        try { getBridge().getWebView().setBackgroundColor(on ? Color.TRANSPARENT : BG); } catch (Exception ignored) {}
    }

    @OptIn(markerClass = ExperimentalCamera2Interop.class)
    private void bindCamera(Runnable after) {
        main.post(() -> {
            if (bound && camera != null) { if (after != null) after.run(); return; }
            ensurePreviewView();
            Runnable go = () -> {
                try {
                    ProcessCameraProvider provider = providerFuture.get();
                    AspectRatioStrategy ar = AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY;
                    Preview.Builder pb = new Preview.Builder()
                            .setResolutionSelector(new ResolutionSelector.Builder().setAspectRatioStrategy(ar).build());
                    new Camera2Interop.Extender<>(pb).setSessionCaptureCallback(new CameraCaptureSession.CaptureCallback() {
                        @Override
                        public void onCaptureCompleted(@NonNull CameraCaptureSession s, @NonNull CaptureRequest r, @NonNull TotalCaptureResult res) {
                            Integer iso = res.get(CaptureResult.SENSOR_SENSITIVITY);
                            Long et = res.get(CaptureResult.SENSOR_EXPOSURE_TIME);
                            if (iso != null && et != null) exposureScore = iso * (et / 1_000_000f);
                        }
                    });
                    Preview preview = pb.build();
                    preview.setSurfaceProvider(previewView.getSurfaceProvider());
                    ImageAnalysis analysis = new ImageAnalysis.Builder()
                            .setResolutionSelector(new ResolutionSelector.Builder()
                                    .setAspectRatioStrategy(ar)
                                    .setResolutionStrategy(new ResolutionStrategy(new Size(1280, 720), ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER))
                                    .build())
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                            .build();
                    analysis.setAnalyzer(exec, this::analyze);
                    provider.unbindAll();
                    camera = provider.bindToLifecycle((LifecycleOwner) getActivity(), CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
                    ZoomState zs = camera.getCameraInfo().getZoomState().getValue();
                    minZoom = zs != null ? Math.max(1f, zs.getMinZoomRatio()) : 1f;
                    maxZoom = zs != null ? Math.max(minZoom, Math.min(zs.getMaxZoomRatio(), 8f)) : 1f;
                    buildScanner();
                    bound = true;
                } catch (Exception e) {
                    Log.e(TAG, "bind failed", e);
                    camera = null; bound = false;
                }
                if (after != null) after.run();
            };
            if (providerFuture.isDone()) go.run(); else providerFuture.addListener(go, ContextCompat.getMainExecutor(getContext()));
        });
    }

    private void unbind() {
        try { if (torchOn && camera != null) camera.getCameraControl().enableTorch(false); } catch (Exception ignored) {}
        torchOn = false;
        try { if (providerFuture.isDone()) providerFuture.get().unbindAll(); } catch (Exception ignored) {}
        camera = null; bound = false;
    }

    private void buildScanner() {
        if (scanner != null) { try { scanner.close(); } catch (Exception ignored) {} }
        BarcodeScannerOptions.Builder b = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .enableAllPotentialBarcodes();   // also reports codes it can SEE but not yet read → drives focus + zoom
        if (maxZoom > 1.05f) {
            b.setZoomSuggestionOptions(new ZoomSuggestionOptions.Builder(ratio -> {
                Camera c = camera;
                if (!autoZoom || c == null || !analyzing) return false;
                float r = Math.max(minZoom, Math.min(maxZoom, ratio));
                c.getCameraControl().setZoomRatio(r);
                JSObject o = new JSObject(); o.put("ratio", r); o.put("auto", true);
                notifyListeners("zoom", o);
                return true;
            }).setMaxSupportedZoomRatio(maxZoom).build());
        }
        scanner = BarcodeScanning.getClient(b.build());
    }

    /* ------------------------------------------------------------ per frame (analysis thread) */
    @OptIn(markerClass = ExperimentalGetImage.class)
    private void analyze(@NonNull ImageProxy proxy) {
        BarcodeScanner sc = scanner;
        Image img = proxy.getImage();
        if (!analyzing || sc == null || img == null) { proxy.close(); return; }
        final int rot = proxy.getImageInfo().getRotationDegrees();
        final int iw = proxy.getWidth(), ih = proxy.getHeight();
        frameNo++;
        autoTorch(proxy);
        InputImage in;
        if (frameNo % 3 == 0 && now() - startedAt > 600) in = InputImage.fromByteArray(invertedNv21(proxy), iw, ih, rot, InputImage.IMAGE_FORMAT_NV21);
        else in = InputImage.fromMediaImage(img, rot);
        final long t0 = now();
        sc.process(in)
                .addOnSuccessListener(exec, list -> handle(list, rot, iw, ih, t0))
                .addOnCompleteListener(exec, t -> proxy.close());
    }

    private void handle(List<Barcode> list, int rot, int iw, int ih, long t0) {
        if (!analyzing || list == null || list.isEmpty()) return;
        Barcode hit = null, seen = null;
        for (Barcode b : list) {
            String v = b.getRawValue();
            if (v != null && !v.isEmpty()) { hit = b; break; }
            if (seen == null) seen = b;
        }
        boolean swap = rot == 90 || rot == 270;
        float uw = swap ? ih : iw, uh = swap ? iw : ih;
        if (hit == null) { if (seen != null) focusOnCode(seen, uw, uh); return; }
        analyzing = false;
        JSObject o = new JSObject();
        o.put("value", hit.getRawValue());
        o.put("ms", now() - startedAt);
        o.put("decodeMs", now() - t0);
        JSArray corners = new JSArray();
        Point[] cp = hit.getCornerPoints();
        if (cp != null) for (Point p : cp) {
            float[] v = toView(p.x, p.y, uw, uh);
            JSObject c = new JSObject(); c.put("x", v[0]); c.put("y", v[1]); corners.put(c);
        }
        o.put("corners", corners);
        if (vibrate) main.post(() -> {
            try { getBridge().getWebView().performHapticFeedback(Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.VIRTUAL_KEY); } catch (Exception ignored) {}
        });
        notifyListeners("scan", o, true);   // retained if JS isn't listening yet (tile launch)
    }

    // analysis-image coords (upright) → normalised view coords, matching PreviewView FILL_CENTER
    private float[] toView(float x, float y, float uw, float uh) {
        float vw = viewW > 0 ? viewW : uw, vh = viewH > 0 ? viewH : uh;
        float s = Math.max(vw / uw, vh / uh), ox = (vw - uw * s) / 2f, oy = (vh - uh * s) / 2f;
        return new float[] { (x * s + ox) / vw, (y * s + oy) / vh };
    }

    private void focusOnCode(Barcode b, float uw, float uh) {
        Rect bb = b.getBoundingBox();
        if (bb == null || now() - lastFocusAt < 700) return;
        lastFocusAt = now();
        float[] v = toView(bb.centerX(), bb.centerY(), uw, uh);
        main.post(() -> focusAt(v[0], v[1]));
    }

    private void focusAt(float nx, float ny) {
        Camera c = camera;
        if (c == null || previewView == null || previewView.getWidth() == 0) return;
        try {
            MeteringPoint pt = previewView.getMeteringPointFactory().createPoint(nx * previewView.getWidth(), ny * previewView.getHeight());
            FocusMeteringAction a = new FocusMeteringAction.Builder(pt, FocusMeteringAction.FLAG_AF | FocusMeteringAction.FLAG_AE)
                    .setAutoCancelDuration(2, TimeUnit.SECONDS).build();
            c.getCameraControl().startFocusAndMetering(a);
        } catch (Exception e) { Log.w(TAG, "focus", e); }
    }

    private void autoTorch(ImageProxy p) {
        Camera c = camera;
        if (!"auto".equals(torchMode) || torchOn || c == null || frameNo % 3 != 0) return;
        if (!c.getCameraInfo().hasFlashUnit()) return;
        ByteBuffer y = p.getPlanes()[0].getBuffer();
        int lim = y.limit(); long sum = 0; int n = 0;
        for (int i = 0; i < lim; i += 97) { sum += y.get(i) & 0xff; n++; }
        float mean = n > 0 ? sum / (float) n : 255;
        boolean dark = mean < 40 || (exposureScore > 45000 && mean < 95);
        darkFrames = dark ? darkFrames + 1 : 0;
        if (darkFrames >= 5) setTorch(true, true);   // ~0.5 s of real darkness
    }

    private void setTorch(boolean on, boolean auto) {
        Camera c = camera;
        if (c == null || !c.getCameraInfo().hasFlashUnit()) return;
        c.getCameraControl().enableTorch(on);
        torchOn = on;
        JSObject o = new JSObject(); o.put("on", on); o.put("auto", auto);
        notifyListeners("torch", o);
    }

    // luminance-only NV21 with Y inverted: lets ML Kit read white-on-black (dark mode) QR codes
    private byte[] invertedNv21(ImageProxy p) {
        int w = p.getWidth(), h = p.getHeight(), size = w * h * 3 / 2;
        if (nv21 == null || nv21.length != size) { nv21 = new byte[size]; Arrays.fill(nv21, w * h, size, (byte) 128); }
        ImageProxy.PlaneProxy plane = p.getPlanes()[0];
        ByteBuffer buf = plane.getBuffer();
        int rs = plane.getRowStride();
        for (int r = 0; r < h; r++) {
            int base = r * rs, o = r * w;
            for (int c = 0; c < w; c++) nv21[o + c] = (byte) (255 - (buf.get(base + c) & 0xff));
        }
        return nv21;
    }

    @Override
    protected void handleOnDestroy() {
        analyzing = false;
        try { if (scanner != null) scanner.close(); } catch (Exception ignored) {}
        exec.shutdown();
    }
}

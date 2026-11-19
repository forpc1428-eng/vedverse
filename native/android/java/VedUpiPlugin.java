package com.vedant.vedverse;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Vedverse UPI bridge.
 *  - getApps(): every installed app that can handle upi://pay, with real icons
 *  - pay({uri, pkg}): launches the UPI intent (explicit package or chooser) and returns the
 *    app's response string (Status=SUCCESS&txnId=...&ApprovalRefNo=...) so payments auto-confirm.
 *  - setWidgetData({json}): feeds the home-screen widgets.
 */
@CapacitorPlugin(name = "VedUpi")
public class VedUpiPlugin extends Plugin {

    @PluginMethod
    public void getApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent probe = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay?pa=test@upi&pn=Test&am=1.00&cu=INR"));
        List<ResolveInfo> list;
        if (Build.VERSION.SDK_INT >= 33) list = pm.queryIntentActivities(probe, PackageManager.ResolveInfoFlags.of(0));
        else list = pm.queryIntentActivities(probe, 0);
        JSArray arr = new JSArray();
        Set<String> seen = new HashSet<>();
        String self = getContext().getPackageName();
        for (ResolveInfo ri : list) {
            String pkg = ri.activityInfo.packageName;
            if (pkg.equals(self) || !seen.add(pkg)) continue;
            JSObject o = new JSObject();
            o.put("pkg", pkg);
            o.put("name", ri.loadLabel(pm).toString());
            try { o.put("icon", iconB64(ri.loadIcon(pm))); } catch (Exception ignored) {}
            arr.put(o);
        }
        JSObject r = new JSObject();
        r.put("apps", arr);
        call.resolve(r);
    }

    private String iconB64(Drawable d) {
        Bitmap b = Bitmap.createBitmap(112, 112, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        d.setBounds(0, 0, 112, 112);
        d.draw(c);
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.PNG, 100, bo);
        return Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
    }

    @PluginMethod
    public void pay(PluginCall call) {
        String uri = call.getString("uri");
        String pkg = call.getString("pkg", "");
        if (uri == null || uri.isEmpty()) { call.reject("uri required"); return; }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
        if (pkg != null && !pkg.isEmpty()) {
            intent.setPackage(pkg);
        } else {
            Intent chooser = Intent.createChooser(intent, "Pay with");
            if (Build.VERSION.SDK_INT >= 24) {
                chooser.putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, new ComponentName[]{ new ComponentName(getContext(), MainActivity.class) });
            }
            intent = chooser;
        }
        try {
            if (call.getBoolean("outside", false)) {
                // opens the UPI app as its own app (own task / recents card); no result comes back
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject r = new JSObject(); r.put("ok", false); r.put("outside", true); r.put("response", "");
                call.resolve(r);
                return;
            }
            startActivityForResult(call, intent, "payResult");
        } catch (ActivityNotFoundException e) {
            call.reject("That UPI app is not installed", "NOAPP");
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "Could not open app" : e.getMessage());
        }
    }

    @ActivityCallback
    private void payResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject r = new JSObject();
        Intent data = result.getData();
        String resp = null;
        if (data != null) {
            resp = data.getStringExtra("response");
            if (resp == null) {
                Bundle ex = data.getExtras();
                if (ex != null) {
                    StringBuilder sb = new StringBuilder();
                    for (String k : ex.keySet()) {
                        Object v = ex.get(k);
                        if (v == null) continue;
                        if (sb.length() > 0) sb.append('&');
                        sb.append(k).append('=').append(v.toString());
                    }
                    resp = sb.toString();
                }
            }
        }
        r.put("resultCode", result.getResultCode());
        r.put("ok", result.getResultCode() == Activity.RESULT_OK);
        r.put("response", resp == null ? "" : resp);
        call.resolve(r);
    }

    @PluginMethod
    public void setWidgetData(PluginCall call) {
        String json = call.getString("json", "{}");
        getContext().getSharedPreferences(VedWidgets.PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply();
        try { VedWidgets.updateAll(getContext()); } catch (Exception ignored) {}
        call.resolve();
    }

    /** Widget Studio → "Add to home screen": asks the launcher to place this design (Android 8+). */
    @PluginMethod
    public void pinWidget(PluginCall call) {
        String key = call.getString("key", "");
        Class<?> k = VedWidgets.classFor(key);
        JSObject r = new JSObject();
        android.appwidget.AppWidgetManager m = android.appwidget.AppWidgetManager.getInstance(getContext());
        if (k == null) { call.reject("Unknown widget"); return; }
        if (Build.VERSION.SDK_INT >= 26 && m.isRequestPinAppWidgetSupported()) {
            r.put("ok", m.requestPinAppWidget(new ComponentName(getContext(), k), null, null));
        } else {
            r.put("ok", false); r.put("reason", "unsupported");
        }
        call.resolve(r);
    }

    /** Receive money: renders a crisp QR (ZXing) for the given text (e.g. your upi://pay link) as base64 PNG. */
    @PluginMethod
    public void makeQr(PluginCall call) {
        String text = call.getString("text", "");
        int size = Math.max(128, Math.min(1400, call.getInt("size", 720)));
        if (text == null || text.isEmpty()) { call.reject("text required"); return; }
        try {
            java.util.Map<com.google.zxing.EncodeHintType, Object> hints = new java.util.HashMap<>();
            hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.M);
            hints.put(com.google.zxing.EncodeHintType.MARGIN, 1);
            hints.put(com.google.zxing.EncodeHintType.CHARACTER_SET, "UTF-8");
            com.google.zxing.common.BitMatrix m = new com.google.zxing.qrcode.QRCodeWriter().encode(text, com.google.zxing.BarcodeFormat.QR_CODE, size, size, hints);
            int w = m.getWidth(), h = m.getHeight();
            int[] px = new int[w * h];
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) px[y * w + x] = m.get(x, y) ? 0xFF000000 : 0xFFFFFFFF;
            Bitmap b = Bitmap.createBitmap(px, w, h, Bitmap.Config.ARGB_8888);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            b.compress(Bitmap.CompressFormat.PNG, 100, bo);
            JSObject r = new JSObject();
            r.put("png", Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP));
            call.resolve(r);
        } catch (Exception e) { call.reject("QR failed: " + e.getMessage()); }
    }

    /** Paste: reads the copied text natively (no WebView permission bubbles). */
    @PluginMethod
    public void getClipboard(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject r = new JSObject();
            try {
                android.content.ClipboardManager cm = (android.content.ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                android.content.ClipData cd = cm != null ? cm.getPrimaryClip() : null;
                CharSequence t = cd != null && cd.getItemCount() > 0 ? cd.getItemAt(0).coerceToText(getContext()) : null;
                r.put("text", t == null ? "" : t.toString());
            } catch (Exception e) { r.put("text", ""); }
            call.resolve(r);
        });
    }

    /** App icon & name: enables the launcher entry for (icon, name) and disables the previous one. */
    @PluginMethod
    public void setAppIcon(PluginCall call) {
        int icon = call.getInt("icon", 0), name = call.getInt("name", 0);
        Context ctx = getContext();
        String next = String.format(java.util.Locale.US, "%s.A%02d_%02d", ctx.getPackageName(), icon, name);
        android.content.SharedPreferences sp = ctx.getSharedPreferences("vv_identity", Context.MODE_PRIVATE);
        String cur = sp.getString("alias", ctx.getPackageName() + ".A00_00");
        JSObject r = new JSObject();
        if (next.equals(cur)) { r.put("ok", true); r.put("changed", false); call.resolve(r); return; }
        try {
            PackageManager pm = ctx.getPackageManager();
            pm.setComponentEnabledSetting(new ComponentName(ctx.getPackageName(), next), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            pm.setComponentEnabledSetting(new ComponentName(ctx.getPackageName(), cur), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            sp.edit().putString("alias", next).putInt("icon", icon).putInt("name", name).apply();
            r.put("ok", true); r.put("changed", true);
            call.resolve(r);
        } catch (Exception e) { call.reject("Couldn't change the app icon: " + e.getMessage()); }
    }

    /** Any name + icon on the home screen: pins a launcher shortcut (Android 8+; the launcher asks to confirm). */
    @PluginMethod
    public void pinShortcut(PluginCall call) {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT < 26) { call.reject("Needs Android 8 or newer"); return; }
        android.content.pm.ShortcutManager sm = ctx.getSystemService(android.content.pm.ShortcutManager.class);
        if (sm == null || !sm.isRequestPinShortcutSupported()) { call.reject("This launcher doesn't support pinned shortcuts"); return; }
        String label = call.getString("label", "Vedverse");
        int icon = call.getInt("icon", 0);
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(call.getString("url", "vedverse://home")));
        i.setPackage(ctx.getPackageName());
        android.graphics.drawable.Icon ic;
        int res = icon > 0 ? ctx.getResources().getIdentifier(String.format(java.util.Locale.US, "vv_ai_%02d", icon), "drawable", ctx.getPackageName()) : 0;
        if (res != 0) ic = android.graphics.drawable.Icon.createWithAdaptiveBitmap(android.graphics.BitmapFactory.decodeResource(ctx.getResources(), res));
        else ic = android.graphics.drawable.Icon.createWithResource(ctx, ctx.getApplicationInfo().icon);
        android.content.pm.ShortcutInfo si = new android.content.pm.ShortcutInfo.Builder(ctx, "vv_named_" + System.currentTimeMillis())
                .setShortLabel(label).setLongLabel(label).setIcon(ic).setIntent(i).build();
        JSObject r = new JSObject(); r.put("ok", sm.requestPinShortcut(si, null)); call.resolve(r);
    }

    @PluginMethod
    public void getAppIcon(PluginCall call) {
        android.content.SharedPreferences sp = getContext().getSharedPreferences("vv_identity", Context.MODE_PRIVATE);
        JSObject r = new JSObject(); r.put("icon", sp.getInt("icon", 0)); r.put("name", sp.getInt("name", 0));
        call.resolve(r);
    }

    /** How many of each design are on the home screen right now. */
    @PluginMethod
    public void widgetInfo(PluginCall call) {
        JSObject r = new JSObject();
        try { r.put("placed", JSObject.fromJSONObject(VedWidgets.counts(getContext()))); } catch (Exception e) { r.put("placed", new JSObject()); }
        call.resolve(r);
    }
}

// Vedverse — HyperScan: the fastest QR pipeline we can build on a phone.
//  APK:  VedScan — our own native CameraX + Google ML Kit plugin (bundled on-device model). It keeps
//        only the newest 720p frame, scans the FULL frame, auto-zooms on small/far codes (ML Kit zoom
//        suggestions), refocuses on a code it can see but not yet read, adds an inverted-colour pass
//        for dark-mode QRs, turns the torch on by itself in the dark, and starts warming the camera
//        the instant your finger touches the scan button.
//  Web:  BarcodeDetector (native, hardware) + jsQR in a Worker racing on every video frame across
//        full-frame and centre crops, with auto-torch and tap-to-focus where the browser allows.
//  Gallery: multi-scale x multi-crop x contrast-boost x inversion passes until something decodes.
//
//  Controller (both engines): { engine, caps:{torch, zoom:{min,max}, autoZoom}, stop(), resume(),
//    setTorchMode('auto'|'on'|'off'), zoom(z), setAutoZoom(bool), focus(nx, ny), frameTo?(canvas) }
//  onResult(text, { engine, ms, decodeMs, corners:[{x,y}] in viewport CSS px })
import { isNative } from './upi.js';

const hasBD = () => 'BarcodeDetector' in window;
let bd = null;
async function detector() {
  if (bd !== null) return bd;
  try {
    if (hasBD()) {
      const fmts = await window.BarcodeDetector.getSupportedFormats();
      bd = fmts.includes('qr_code') ? new window.BarcodeDetector({ formats: ['qr_code'] }) : false;
    } else bd = false;
  } catch (e) { bd = false; }
  return bd;
}

let worker = null, wid = 0;
const pending = new Map();
function getWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./scan-worker.js', import.meta.url));
    worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
  } catch (e) { worker = null; }
  return worker;
}
function workerDecode(imgData, mode) {
  const w = getWorker();
  if (!w) return Promise.resolve({ text: window.jsQR ? (window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: mode || 'attemptBoth' }) || {}).data : null });
  return new Promise(res => {
    const id = ++wid;
    pending.set(id, res);
    const buf = imgData.data.buffer;
    w.postMessage({ id, w: imgData.width, h: imgData.height, buf, mode }, [buf]);
  });
}

/* ------------------------------------------------------------------ */
/* Native engine: VedScan (CameraX + ML Kit), see native/android/java/VedScanPlugin.java */
let VS = null;
function plugin() {
  if (!isNative()) return null;
  try { return VS || (VS = window.Capacitor.registerPlugin('VedScan')); } catch (e) { return null; }
}
export function nativeAvailable() {
  try { return isNative() && !!window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('VedScan'); } catch (e) { return false; }
}
const wantNative = () => (window.__vv_scanEngine || 'auto') !== 'web' && nativeAvailable();

// Warm the camera the moment a finger lands on a scan button (~100-250 ms saved before the tap even ends)
let warm = null;
export function prepare() {
  if (wantNative()) { plugin().prepare().catch(() => {}); return; }
  if (warm || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  const w = warm = { used: false, p: getStream().catch(() => null) };
  setTimeout(() => { if (warm === w && !w.used) { w.p.then(s => s && s.getTracks().forEach(t => t.stop())); warm = null; } }, 4000);
}
// finger slid away without opening the scanner: let the camera go
export function cancelPrepare() {
  if (wantNative()) plugin().release().catch(() => {});
}

export async function startNative(onResult, opts = {}) {
  const P = plugin();
  const subs = []; let done = false; const t0 = performance.now();
  const add = async (ev, fn) => { try { subs.push(await P.addListener(ev, fn)); } catch (e) {} };
  await add('scan', ev => {
    if (done || !ev || !ev.value) return;
    done = true;
    onResult(ev.value, {
      engine: 'ML Kit', ms: ev.ms != null ? ev.ms : Math.round(performance.now() - t0), decodeMs: ev.decodeMs,
      corners: (ev.corners || []).map(c => ({ x: c.x * innerWidth, y: c.y * innerHeight })),
    });
  });
  await add('zoom', ev => opts.onZoom && opts.onZoom(ev.ratio, !!ev.auto));
  await add('torch', ev => opts.onTorch && opts.onTorch(!!ev.on, !!ev.auto));
  document.documentElement.classList.add('native-scan');
  let r;
  try { r = await P.start({ torch: opts.torch || 'auto', vibrate: opts.vibrate !== false, autoZoom: opts.autoZoom !== false }); }
  catch (e) { subs.forEach(s => { try { s.remove(); } catch (x) {} }); document.documentElement.classList.remove('native-scan'); throw e; }
  return {
    engine: 'ML Kit · CameraX',
    caps: { torch: !!r.torch, zoom: r.zoom || { min: 1, max: 1 }, autoZoom: true },
    async stop() { done = true; subs.forEach(s => { try { s.remove(); } catch (x) {} }); try { await P.stop(); } catch (e) {} document.documentElement.classList.remove('native-scan'); },
    resume() { done = false; P.resume().catch(() => {}); },
    setTorchMode(m) { return P.setTorch({ mode: m }).then(x => !!(x && x.on)).catch(() => false); },
    zoom(z) { P.setZoom({ ratio: z }).catch(() => {}); },
    setAutoZoom(v) { P.setAutoZoom({ enabled: !!v }).catch(() => {}); },
    focus(nx, ny) { P.focus({ x: nx, y: ny }).catch(() => {}); },
  };
}

/* ------------------------------------------------------------------ */
/* Web engine */
function getStream() {
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 }, height: { ideal: 1080 },
      frameRate: { ideal: 60, min: 24 },
      advanced: [{ focusMode: 'continuous' }, { exposureMode: 'continuous' }, { whiteBalanceMode: 'continuous' }],
    },
  };
  return navigator.mediaDevices.getUserMedia(constraints).catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }));
}

export async function startWeb(video, onResult, opts = {}) {
  let stream = null;
  if (warm) { warm.used = true; stream = await warm.p; warm = null; }
  if (!stream || !stream.active) stream = await getStream();
  video.srcObject = stream;
  video.setAttribute('playsinline', ''); video.muted = true;
  await video.play().catch(() => {});
  const track = stream.getVideoTracks()[0];
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (e) {}
  const det = await detector();
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  let running = true, frame = 0, bdBusy = false, wkBusy = false, done = false;
  const t0 = performance.now();

  // video pixel -> viewport CSS px (the video is object-fit: cover, full screen)
  const toView = (pts) => {
    const vw = video.videoWidth, vh = video.videoHeight, W = innerWidth, H = innerHeight;
    const s = Math.max(W / vw, H / vh), ox = (W - vw * s) / 2, oy = (H - vh * s) / 2;
    return pts.map(p => ({ x: p.x * s + ox, y: p.y * s + oy }));
  };
  const found = (text, engine, corners) => {
    if (done || !running || !text) return;
    done = true;
    onResult(text, { engine, ms: Math.round(performance.now() - t0), corners: corners ? toView(corners) : [] });
  };

  // torch: 'auto' watches scene brightness and lights up in the dark
  let torchMode = opts.torch || 'auto', torchOn = false, dark = 0;
  const applyTorch = async (on, auto) => {
    if (!caps.torch || on === torchOn) return torchOn;
    try { await track.applyConstraints({ advanced: [{ torch: on }] }); torchOn = on; if (opts.onTorch) opts.onTorch(on, auto); } catch (e) {}
    return torchOn;
  };
  if (torchMode === 'on') applyTorch(true, false);

  const crops = [[1, 720], [0.6, 480], [0.85, 600]];
  const tick = () => {
    if (!running) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (vw && vh && !done) {
      frame++;
      if (det && !bdBusy) {         // Engine A: hardware detector on the full frame
        bdBusy = true;
        det.detect(video).then(r => { bdBusy = false; if (r && r[0] && r[0].rawValue) found(r[0].rawValue, 'BarcodeDetector', r[0].cornerPoints); }).catch(() => { bdBusy = false; });
      }
      if (!wkBusy) {                // Engine B: jsQR in a worker, rotating full-frame / centre crops
        const [frac, size] = crops[frame % crops.length];
        const side = Math.min(vw, vh) * frac;
        const sw = frac === 1 ? vw : side, sh = frac === 1 ? vh : side;
        const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
        const scale = Math.min(1, size / Math.max(sw, sh));
        cvs.width = Math.round(sw * scale); cvs.height = Math.round(sh * scale);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
        const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
        if (torchMode === 'auto' && caps.torch && !torchOn && frame % 6 === 0) {
          const d = img.data; let sum = 0, n = 0;
          for (let i = 0; i < d.length; i += 64) { sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; }
          dark = sum / n < 48 ? dark + 1 : 0;
          if (dark >= 4) applyTorch(true, true);
        }
        wkBusy = true;
        workerDecode(img).then(r => {
          wkBusy = false;
          if (r && r.text) {
            const L = r.loc; const m = p => ({ x: sx + p.x / scale, y: sy + p.y / scale });
            found(r.text, 'jsQR', L ? [m(L.topLeftCorner), m(L.topRightCorner), m(L.bottomRightCorner), m(L.bottomLeftCorner)] : null);
          }
        }).catch(() => { wkBusy = false; });
      }
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
  };
  tick();

  let focusT = 0;
  return {
    engine: det ? 'Dual engine' : 'jsQR turbo',
    stream, track,
    caps: { torch: !!caps.torch, zoom: caps.zoom ? { min: caps.zoom.min || 1, max: Math.min(caps.zoom.max || 1, 8) } : null, autoZoom: false },
    async setTorchMode(m) { torchMode = m; dark = 0; return applyTorch(m === 'on', false); },
    async zoom(z) { try { await track.applyConstraints({ advanced: [{ zoom: z }] }); } catch (e) {} },
    setAutoZoom() {},
    async focus(nx, ny) {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot', pointsOfInterest: [{ x: nx, y: ny }] }] });
        clearTimeout(focusT); focusT = setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {}), 1800);
      } catch (e) {}
    },
    resume() { done = false; },
    frameTo(canvas) { try { canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d').drawImage(video, 0, 0); } catch (e) {} },
    async stop() { running = false; clearTimeout(focusT); try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} video.srcObject = null; },
  };
}

export async function start(video, onResult, onError, opts = {}) {
  if (wantNative()) {
    try { return await startNative(onResult, opts); }
    catch (e) {
      console.warn('Native scanner failed, falling back to web', e);
      if (/permission/i.test(String(e && e.message))) { if (onError) onError(e); return null; }
    }
  }
  try { return await startWeb(video, onResult, opts); }
  catch (e) { if (onError) onError(e); return null; }
}

/* ------------------------------------------------------------------ */
/* Gallery / screenshot / clipboard decoder */
function enhance(img) {
  // grayscale + auto-contrast stretch — rescues washed-out screenshots and photos of screens
  const d = img.data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) { const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; d[i] = g; if (g < lo) lo = g; if (g > hi) hi = g; }
  const r = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255 / r))); d[i] = d[i + 1] = d[i + 2] = v; }
  return img;
}

export async function decodeImage(source) {
  let bmp;
  try { bmp = source instanceof Blob ? await createImageBitmap(source) : source; }
  catch (e) {
    bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(source); });
  }
  const det = await detector();
  if (det) { try { const r = await det.detect(bmp); if (r && r[0]) return r[0].rawValue; } catch (e) {} }
  const W = bmp.width, H = bmp.height;
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  const crops = [[0, 0, 1, 1], [0.15, 0.15, 0.7, 0.7], [0, 0.2, 1, 0.6], [0.25, 0.25, 0.5, 0.5], [0, 0, 1, 0.5], [0, 0.5, 1, 0.5]];
  const sizes = [1400, 900, 600, 380];
  for (const [cx, cy, cw, ch] of crops) {
    for (const size of sizes) {
      const sw = W * cw, sh = H * ch;
      const sc = Math.min(1, size / Math.max(sw, sh));
      cvs.width = Math.max(1, Math.round(sw * sc)); cvs.height = Math.max(1, Math.round(sh * sc));
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, W * cx, H * cy, sw, sh, 0, 0, cvs.width, cvs.height);
      for (const boost of [false, true]) {
        let img = ctx.getImageData(0, 0, cvs.width, cvs.height);
        if (boost) img = enhance(img);
        const r = await workerDecode(img, 'attemptBoth');
        if (r && r.text) return r.text;
      }
    }
  }
  return null;
}

export async function readClipboard() {
  // text only: native clipboard on Android (no WebView paste/permission bubbles), web API elsewhere
  try { const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VedUpi; if (P && P.getClipboard) { const r = await P.getClipboard(); return (r && r.text) || ''; } } catch (e) {}
  try { return await navigator.clipboard.readText(); } catch (e) { return ''; }
}

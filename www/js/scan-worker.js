// jsQR running off the main thread so the UI never stutters while scanning
importScripts('../vendor/jsQR.js');
let flip = 0;
self.onmessage = (e) => {
  const { id, w, h, buf, mode } = e.data;
  const data = new Uint8ClampedArray(buf);
  flip++;
  let inv = mode || (flip % 2 ? 'dontInvert' : 'attemptBoth');
  let r = null;
  try { r = self.jsQR(data, w, h, { inversionAttempts: inv }); } catch (err) {}
  self.postMessage({ id, text: r ? r.data : null, loc: r ? r.location : null, w, h });
};

// Vedverse — black-hole loop renderer. Renders the real ray-traced black hole frame by frame (deterministic time),
// blends the end into the start (seamless loop), encodes with WebCodecs and writes MP4 (H.264) or WebM (VP9/VP8).
// The same code bakes the built-in colours on the dev machine and the exact-size versions on the phone.

const enc8 = s => new TextEncoder().encode(s);
const cat = (...a) => { let n = 0; for (const x of a) n += x.length; const o = new Uint8Array(n); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; };
const u16 = n => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xffff); return b; };
const u8 = n => new Uint8Array([n & 255]);
const zeros = n => new Uint8Array(n);

/* ------------------------------------------------------------------ MP4 (ISO BMFF) writer: one H.264 track */
const box = (type, ...p) => { const body = cat(...p); return cat(u32(body.length + 8), enc8(type), body); };
const full = (type, ver, flags, ...p) => box(type, u8(ver), new Uint8Array([(flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...p);
const MATRIX = cat(u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000));
export function writeMP4(samples, avcC, W, H, fps) {
  const n = samples.length, ts = fps * 1000, delta = 1000, dur = n * delta, durMs = Math.round(n * 1000 / fps);
  const ftyp = box('ftyp', enc8('isom'), u32(512), enc8('isom'), enc8('iso2'), enc8('avc1'), enc8('mp41'));
  const stsd = full('stsd', 0, 0, u32(1), box('avc1', zeros(6), u16(1), zeros(16), u16(W), u16(H), u32(0x00480000), u32(0x00480000), u32(0), u16(1), zeros(32), u16(0x18), u16(0xffff), box('avcC', new Uint8Array(avcC))));
  const stts = full('stts', 0, 0, u32(1), u32(n), u32(delta));
  const keys = []; samples.forEach((s, i) => { if (s.key) keys.push(i + 1); });
  const stss = full('stss', 0, 0, u32(keys.length), ...keys.map(u32));
  const stsc = full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1));
  const stsz = full('stsz', 0, 0, u32(0), u32(n), ...samples.map(s => u32(s.data.length)));
  const moovFor = off => {
    const stbl = box('stbl', stsd, stts, stss, stsc, stsz, full('stco', 0, 0, u32(1), u32(off)));
    const minf = box('minf', full('vmhd', 0, 1, zeros(8)), box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))), stbl);
    const mdia = box('mdia', full('mdhd', 0, 0, u32(0), u32(0), u32(ts), u32(dur), u16(0x55c4), u16(0)), full('hdlr', 0, 0, u32(0), enc8('vide'), zeros(12), enc8('Vedverse\0')), minf);
    const tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durMs), zeros(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(W * 65536), u32(H * 65536));
    const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000), u16(0x0100), zeros(10), MATRIX, zeros(24), u32(2));
    return box('moov', mvhd, box('trak', tkhd, mdia));
  };
  const probe = moovFor(0);
  const moov = moovFor(ftyp.length + probe.length + 8);
  const mdatLen = samples.reduce((a, s) => a + s.data.length, 0);
  return new Blob([ftyp, moov, cat(u32(mdatLen + 8), enc8('mdat')), ...samples.map(s => s.data)], { type: 'video/mp4' });
}

/* ------------------------------------------------------------------ WebM (EBML) writer: one VP9/VP8 track */
export function writeWebM(samples, codecId, W, H, fps) {
  const sz = n => { const o = new Uint8Array(8); o[0] = 1; for (let i = 7; i >= 1; i--) { o[i] = n % 256; n = Math.floor(n / 256); } return o; };
  const id = h => { const o = []; for (let i = 0; i < h.length; i += 2) o.push(parseInt(h.slice(i, i + 2), 16)); return new Uint8Array(o); };
  const el = (h, ...p) => { const b = cat(...p); return cat(id(h), sz(b.length), b); };
  const u = n => { const o = []; do { o.unshift(n & 255); n = Math.floor(n / 256); } while (n > 0); return new Uint8Array(o); };
  const f64 = v => { const b = new ArrayBuffer(8); new DataView(b).setFloat64(0, v); return new Uint8Array(b); };
  const frameMs = 1000 / fps;
  const header = el('1A45DFA3', el('4286', u(1)), el('42F7', u(1)), el('42F2', u(4)), el('42F3', u(8)), el('4282', enc8('webm')), el('4287', u(4)), el('4285', u(2)));
  const info = el('1549A966', el('2AD7B1', u(1000000)), el('4D80', enc8('vedverse')), el('5741', enc8('vedverse')), el('4489', f64(samples.length * frameMs)));
  const tracks = el('1654AE6B', el('AE', el('D7', u(1)), el('73C5', u(1)), el('83', u(1)), el('86', enc8(codecId)), el('E0', el('B0', u(W)), el('BA', u(H)))));
  const clusters = [];
  for (let i = 0; i < samples.length;) {
    const t0 = Math.round(i * frameMs), blocks = [];
    do { const rel = Math.round(i * frameMs) - t0; blocks.push(el('A3', new Uint8Array([0x81, (rel >> 8) & 255, rel & 255, samples[i].key ? 0x80 : 0]), samples[i].data)); i++; } while (i < samples.length && !samples[i].key);
    clusters.push(el('1F43B675', el('E7', u(t0)), ...blocks));
  }
  return new Blob([header, el('18538067', info, tracks, ...clusters)], { type: 'video/webm' });
}

/* ------------------------------------------------------------------ pick the best encoder this device has */
export async function pickCodec(W, H, fps, bitrate) {
  if (typeof VideoEncoder === 'undefined') return null;
  const C = [
    { codec: 'avc1.640033', kind: 'mp4' }, { codec: 'avc1.4d0033', kind: 'mp4' }, { codec: 'avc1.42e033', kind: 'mp4' },
    { codec: 'vp09.00.41.08', kind: 'webm', id: 'V_VP9' }, { codec: 'vp8', kind: 'webm', id: 'V_VP8' },
  ];
  for (const c of C) {
    const cfg = { codec: c.codec, width: W, height: H, bitrate, framerate: fps, latencyMode: 'quality', ...(c.kind === 'mp4' ? { avc: { format: 'avc' } } : {}) };
    try { const s = await VideoEncoder.isConfigSupported(cfg); if (s && s.supported) return { ...c, cfg }; } catch (e) {}
  }
  return null;
}

/* ------------------------------------------------------------------ bake one seamless loop
   Universe: the live renderer class · theme: a THEMES entry · W×H: output pixels (even)
   gate(): optional async fn awaited before each frame (the phone uses it to work only while idle)
   abort(): optional fn → true to stop (rotation, app closing) */
export async function bakeLoop(Universe, theme, { W, H, seconds = 12, fps = 30, fade = 1, steps = 90, rt = 1, sky = 'hi', bpp = 0.1, gate, abort, onProgress } = {}) {
  W -= W % 2; H -= H % 2;
  const bitrate = Math.round(Math.min(16e6, Math.max(2.5e6, W * H * fps * bpp)));
  const pick = await pickCodec(W, H, fps, bitrate);
  if (!pick) throw new Error('no-encoder');
  // a dedicated renderer sized exactly W×H, never attached to the page
  const cv = document.createElement('canvas');
  const proto = Universe.prototype, orig = proto.resolveQuality;
  const dpr = W / Math.max(1, innerWidth);
  proto.resolveQuality = () => ({ name: 'bake', dpr, rt, steps, k: 0.08, stars: 9000, sky });
  let U;
  try { U = new Universe(cv, { quality: 'high', particles: 1, parallax: false, creature: true }); } finally { proto.resolveQuality = orig; }
  const out = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = out.getContext('2d');
  const samples = []; let avcC = null, encErr = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) avcC = meta.decoderConfig.description; const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); samples.push({ key: chunk.type === 'key', ts: chunk.timestamp, data: b }); },
    error: e => { encErr = e; },
  });
  try {
    await U.ready;
    U.renderer.setAnimationLoop(null);
    for (let i = 0; i < 300 && !(U.skyReady && U.bhMat.uniforms.uDisk.value && U.bhMat.uniforms.uDisk.value.image); i++) await new Promise(r => setTimeout(r, 100));
    U.setTheme(theme); U.setGrain(false); U.mode('home');
    U.adapted = 99; U.fpsCap = 30; U.timer.getDelta = () => 1 / fps;
    enc.configure(pick.cfg);
    let time = 1e5;
    const step = async () => {
      if (gate) await gate();
      if (abort && abort()) throw new Error('aborted');
      time += 1000 / fps + 1; U.running = true; U.paused = false; U.loop(time);
    };
    const grab = () => { g.globalAlpha = 1; g.drawImage(U.renderer.domElement, 0, 0, W, H); };
    const PRE = 75, M = Math.round(seconds * fps), FF = Math.round(fade * fps);
    const total = PRE + FF + M;
    let done = 0; const tick = () => onProgress && onProgress(++done / total);
    for (let i = 0; i < PRE; i++) { await step(); tick(); }                 // settle camera, debris and disk flow
    const head = [];                                                         // R(0..FF-1): blended into the loop's end
    for (let i = 0; i < FF; i++) { await step(); grab(); head.push(out.convertToBlob ? await out.convertToBlob({ type: 'image/jpeg', quality: 0.95 }) : await new Promise(r => out.toBlob(r, 'image/jpeg', 0.95))); tick(); }
    for (let k = 0; k < M; k++) {
      await step(); grab();                                                  // this is R(k + FF)
      if (k >= M - FF) { const bm = await createImageBitmap(head[k - (M - FF)]); g.globalAlpha = (k - (M - FF) + 1) / (FF + 1); g.drawImage(bm, 0, 0, W, H); g.globalAlpha = 1; bm.close && bm.close(); }
      const vf = new VideoFrame(out, { timestamp: Math.round(k * 1e6 / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: k % fps === 0 }); vf.close();
      while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 4));
      if (encErr) throw encErr;
      tick();
    }
    await enc.flush();
    if (encErr) throw encErr;
    samples.sort((a, b) => a.ts - b.ts);
    const blob = pick.kind === 'mp4' ? (avcC ? writeMP4(samples, avcC, W, H, fps) : null) : writeWebM(samples, pick.id, W, H, fps);
    if (!blob) throw new Error('no-avcC');
    let poster = null;
    try { const bm = await createImageBitmap(head[0]); g.drawImage(bm, 0, 0, W, H); poster = out.convertToBlob ? await out.convertToBlob({ type: 'image/jpeg', quality: 0.9 }) : null; } catch (e) {}
    return { blob, poster, mime: blob.type, codec: pick.codec, W, H, frames: M };
  } finally {
    try { enc.state !== 'closed' && enc.close(); } catch (e) {}
    try { U.dispose(); U.renderer.forceContextLoss && U.renderer.forceContextLoss(); } catch (e) {}
  }
}

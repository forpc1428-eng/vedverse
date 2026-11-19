// Vedverse — FX: haptics, synthesized sound ("Sound Money"), glass shatter, crack, confetti
import { store } from './store.js';

/* ---------- Haptics ---------- */
let HapticsP = null;
function hp() { if (HapticsP === null) { try { HapticsP = window.Capacitor && window.Capacitor.isNativePlatform() ? window.Capacitor.registerPlugin('Haptics') : false; } catch (e) { HapticsP = false; } } return HapticsP; }
export function haptic(kind = 'tick') {
  if (!store.s.haptics) return;
  const P = hp();
  const k = { light: 0.55, normal: 1, strong: 1.7 }[store.s.hapticStrength] || 1;
  let pat = { tick: 6, soft: 10, tap: 14, success: [12, 60, 24], error: [30, 50, 30, 50, 30], heavy: 35, scan: [8, 30, 16], beat: [18, 120, 28] }[kind] || 8;
  pat = Array.isArray(pat) ? pat.map((x, i) => i % 2 ? x : Math.round(x * k)) : Math.round(pat * k);
  if (P) {
    try {
      if (kind === 'success') P.notification({ type: 'SUCCESS' });
      else if (kind === 'error') P.notification({ type: 'ERROR' });
      else if (kind === 'heavy' || (k > 1.2 && (kind === 'tap' || kind === 'scan'))) P.impact({ style: 'HEAVY' });
      else if ((kind === 'tap' || kind === 'scan') && k > 0.7 || (k > 1.2)) P.impact({ style: 'MEDIUM' });
      else P.impact({ style: 'LIGHT' });
      return;
    } catch (e) {}
  }
  try { navigator.vibrate && navigator.vibrate(pat); } catch (e) {}
}

/* ---------- Sound ---------- */
let ctx = null, master = null;
function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const PACKS = { cosmic: {}, minimal: { type: 'sine', vol: 0.55, dur: 0.7 }, crystal: { type: 'triangle', f: 1.6, dur: 0.9 }, retro: { type: 'square', vol: 0.45 }, deep: { type: 'sine', f: 0.55, dur: 1.3 }, synth: { type: 'sawtooth', vol: 0.4 } };
function tone({ f = 660, type = 'sine', dur = 0.12, vol = 0.2, attack = 0.005, slide = 0, delay = 0, q = 0, filter = 0 }) {
  const pk = PACKS[store.s.soundPack] || {}; if (pk.type) type = pk.type; if (pk.f) { f *= pk.f; slide *= pk.f; } if (pk.vol) vol *= pk.vol; if (pk.dur) dur *= pk.dur;
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) { const bf = c.createBiquadFilter(); bf.type = 'lowpass'; bf.frequency.value = filter; bf.Q.value = q; o.connect(bf); node = bf; }
  node.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur = 0.4, vol = 0.25, hp = 1200, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const CAT_VOICE = { food: 'triangle', study: 'sine', travel: 'square', shop: 'sawtooth', bills: 'sine', friends: 'triangle', fun: 'square', health: 'sine', other: 'triangle' };
export function noteFor(amount, cat = 'other', delay = 0, vol = 0.18) {
  const idx = Math.min(PENTA.length - 1, Math.floor(Math.log10(Math.max(1, amount)) * 3));
  const f = 220 * Math.pow(2, PENTA[idx] / 12);
  const type = CAT_VOICE[cat] || 'triangle';
  tone({ f, type, dur: 0.9, vol: type === 'sine' ? vol * 1.3 : vol * 0.55, attack: 0.01, delay, filter: 2600 });
  tone({ f: f * 2, type: 'sine', dur: 0.6, vol: vol * 0.25, delay: delay + 0.01 });
}
export const sfx = {
  tick() { if (store.s.sounds) tone({ f: 1800, type: 'sine', dur: 0.03, vol: 0.05 }); },
  key(d) { if (store.s.sounds) tone({ f: 520 + (+d || 0) * 38, type: 'sine', dur: 0.09, vol: 0.09, filter: 3000 }); },
  back() { if (store.s.sounds) tone({ f: 380, type: 'triangle', dur: 0.08, vol: 0.08, slide: 0.6 }); },
  open() { if (store.s.sounds) { tone({ f: 420, type: 'sine', dur: 0.25, vol: 0.08, slide: 1.8 }); } },
  close() { if (store.s.sounds) tone({ f: 700, type: 'sine', dur: 0.2, vol: 0.06, slide: 0.5 }); },
  scan() { if (store.s.sounds && store.s.scanBeep) { tone({ f: 1320, type: 'sine', dur: 0.08, vol: 0.18 }); tone({ f: 1980, type: 'sine', dur: 0.14, vol: 0.14, delay: 0.06 }); } },
  shatter() { if (store.s.sounds) { noise(0.6, 0.35, 2200); noise(0.3, 0.2, 5000, 0.04); tone({ f: 3200, type: 'sine', dur: 0.4, vol: 0.05, slide: 0.4 }); } },
  whoosh() { if (store.s.sounds) { noise(0.7, 0.12, 400); tone({ f: 120, type: 'sine', dur: 0.6, vol: 0.18, slide: 4 }); } },
  success(am, cat) {
    if (!store.s.sounds) return;
    [0, 4, 7, 12].forEach((s, i) => tone({ f: 523.25 * Math.pow(2, s / 12), type: 'sine', dur: 0.5, vol: 0.12, delay: i * 0.07 }));
    if (store.s.music) noteFor(am, cat, 0.35);
  },
  error() { if (store.s.sounds) { tone({ f: 220, type: 'square', dur: 0.15, vol: 0.06, filter: 900 }); tone({ f: 180, type: 'square', dur: 0.2, vol: 0.06, delay: 0.15, filter: 900 }); } },
  toggle(on) { if (store.s.sounds) tone({ f: on ? 880 : 560, type: 'sine', dur: 0.07, vol: 0.07 }); },
  breath(p) { if (store.s.sounds) tone({ f: 200 + p * 400, type: 'sine', dur: 0.12, vol: 0.04 }); },
};

/** "Play my month" — every payment becomes a note */
export function playMonth(txs, onNote) {
  const list = txs.slice().sort((a, b) => a.ts - b.ts).slice(-48);
  const step = Math.max(0.12, Math.min(0.32, 9 / Math.max(1, list.length)));
  list.forEach((t, i) => {
    noteFor(+t.am, t.cat, i * step, 0.16);
    setTimeout(() => onNote && onNote(t, i), i * step * 1000);
  });
  if (list.length) tone({ f: 110, type: 'sine', dur: list.length * step + 1.5, vol: 0.05, attack: 0.6 });
  return list.length * step * 1000;
}

/* ---------- Glass shatter (2D physics over everything) ---------- */
export function shatter({ x = innerWidth / 2, y = innerHeight / 2, colors = ['#8b5cf6', '#22d3ee', '#f472b6'], duration = 1300 } = {}) {
  return new Promise(resolve => {
    if (!store.s.shatter || store.s.reducedMotion) return resolve();
    const cvs = document.createElement('canvas');
    const dpr = Math.min(2, devicePixelRatio || 1);
    cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr;
    cvs.className = 'fx-canvas';
    document.body.appendChild(cvs);
    const g = cvs.getContext('2d'); g.scale(dpr, dpr);
    // build radial shard mesh
    const rings = [0, 40, 110, 220, 380, 620, 1000];
    const spokes = 18;
    const pts = rings.map((r, ri) => Array.from({ length: spokes }, (_, i) => {
      const a = (i / spokes) * Math.PI * 2 + (ri % 2 ? 0.17 : 0) + (Math.random() - .5) * 0.22;
      const rr = r * (0.85 + Math.random() * 0.3);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    }));
    const shards = [];
    for (let ri = 0; ri < rings.length - 1; ri++) for (let i = 0; i < spokes; i++) {
      const a = pts[ri][i], b = pts[ri][(i + 1) % spokes], c = pts[ri + 1][(i + 1) % spokes], d = pts[ri + 1][i];
      const poly = ri === 0 ? [a, c, d] : [a, b, c, d];
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const ang = Math.atan2(cy - y, cx - x), dist = Math.hypot(cx - x, cy - y);
      const sp = 380 + Math.random() * 520 + (600 - Math.min(600, dist)) * 0.8;
      shards.push({ poly: poly.map(p => [p[0] - cx, p[1] - cy]), cx, cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 200, vr: (Math.random() - .5) * 10, r: 0, delay: dist / 2200, col: colors[(ri + i) % colors.length], z: Math.random() });
    }
    const t0 = performance.now();
    const frame = (now) => {
      const t = (now - t0) / 1000;
      g.clearRect(0, 0, innerWidth, innerHeight);
      // flash
      if (t < 0.25) { g.fillStyle = `rgba(255,255,255,${0.35 * (1 - t / 0.25)})`; g.fillRect(0, 0, innerWidth, innerHeight); }
      for (const s of shards) {
        const lt = Math.max(0, t - s.delay);
        const px = s.cx + s.vx * lt, py = s.cy + s.vy * lt + 900 * lt * lt;
        const rot = s.vr * lt;
        const alpha = Math.max(0, 1 - lt / 0.95);
        if (alpha <= 0) continue;
        g.save(); g.translate(px, py); g.rotate(rot); const sc = 1 - lt * 0.3 * s.z; g.scale(sc, sc);
        g.beginPath(); s.poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
        const gr = g.createLinearGradient(-60, -60, 60, 60);
        gr.addColorStop(0, `rgba(255,255,255,${0.32 * alpha})`); gr.addColorStop(0.5, hexA(s.col, 0.16 * alpha)); gr.addColorStop(1, `rgba(255,255,255,${0.06 * alpha})`);
        g.fillStyle = gr; g.fill();
        g.strokeStyle = `rgba(255,255,255,${0.75 * alpha})`; g.lineWidth = 1.2; g.stroke();
        g.restore();
      }
      if (t * 1000 < duration) requestAnimationFrame(frame); else { cvs.remove(); }
      if (t > 0.42 && !frame.done) { frame.done = true; resolve(); }
    };
    requestAnimationFrame(frame);
  });
}
function hexA(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

/* ---------- Ice-crack lines (shown the instant a QR locks) ---------- */
export function crackSVG(cx = 50, cy = 50) {
  let paths = '';
  const N = 11;
  for (let i = 0; i < N; i++) {
    let a = (i / N) * Math.PI * 2 + Math.random() * 0.4, x = cx, y = cy, d = `M${x} ${y}`;
    const L = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < L; k++) { a += (Math.random() - .5) * 0.7; const step = 6 + Math.random() * 12; x += Math.cos(a) * step; y += Math.sin(a) * step; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    paths += `<path d="${d}" style="--d:${(i * 0.012).toFixed(3)}s"/>`;
  }
  // concentric fracture ring
  let ring = '';
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 12 + Math.random() * 6; ring += (i ? ' L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); }
  return `<svg class="crack" viewBox="0 0 100 100" preserveAspectRatio="none">${paths}<path class="ring" d="${ring} Z"/></svg>`;
}

/* ---------- Confetti of light ---------- */
export function confetti(colors) {
  if (!store.s.confettiOnSuccess || store.s.reducedMotion) return;
  const cvs = document.createElement('canvas'); const dpr = Math.min(2, devicePixelRatio || 1);
  cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; cvs.className = 'fx-canvas'; document.body.appendChild(cvs);
  const g = cvs.getContext('2d'); g.scale(dpr, dpr);
  const P = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.38, vx: (Math.random() - .5) * 900, vy: -Math.random() * 900 - 200, r: Math.random() * 6, vr: (Math.random() - .5) * 12, w: 4 + Math.random() * 6, h: 8 + Math.random() * 10, c: colors[Math.floor(Math.random() * colors.length)] }));
  const t0 = performance.now();
  const f = (now) => {
    const t = (now - t0) / 1000; g.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { const x = p.x + p.vx * t * 0.8, y = p.y + p.vy * t + 900 * t * t; g.save(); g.translate(x, y); g.rotate(p.r + p.vr * t); g.globalAlpha = Math.max(0, 1 - t / 2.2); g.fillStyle = p.c; g.scale(1, Math.cos(t * 8 + p.r)); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
    if (t < 2.3) requestAnimationFrame(f); else cvs.remove();
  };
  requestAnimationFrame(f);
}

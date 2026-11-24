// Vedverse — the black hole, never rendered live while you use the app.
// 1. Every built-in colour ships pre-rendered (assets/space/bh/<theme>.mp4), so the right one plays from the first second.
// 2. In the background — only while you're not touching the phone — Vedverse re-renders each colour once with the real
//    ray-tracer at this phone's exact screen size and stores it (IndexedDB). From then on it only ever plays stored video.
// Same API as the live Universe, so the rest of the app doesn't care which one is running.
import { store } from './store.js';
import { THEMES } from './themes.js';

const BAKE_V = 1;                       // bump when the renderer's look changes → everything re-bakes once
const BUNDLED = 'assets/space/bh/';
const BASE_HUE = 34;

/* ------------------------------------------------------------------ small helpers */
function hue(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return BASE_HUE;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return BASE_HUE;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueDiff = (a, b) => ((a - b + 540) % 360) - 180;
function themeKey(t) {
  const s = ['bg0', 'bg1', 'a1', 'a2', 'a3', 'hot', 'temp', 'sat', 'yaw', 'pitch'].map(k => t && t[k] != null ? t[k] : '').join('|');
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ------------------------------------------------------------------ storage (IndexedDB: survives restarts, never leaves the phone) */
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const rq = indexedDB.open('vv-blackhole', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('loops', { keyPath: 'key' });
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    } catch (e) { rej(e); }
  });
  return dbp;
}
async function idb(mode, fn) { const d = await db(); return new Promise((res, rej) => { const tx = d.transaction('loops', mode); const st = tx.objectStore('loops'); const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); }
const getLoop = key => idb('readonly', st => st.get(key)).catch(() => null);
const putLoop = rec => idb('readwrite', st => st.put(rec)).catch(() => null);
const allKeys = () => idb('readonly', st => st.getAllKeys()).catch(() => []);
const delLoop = key => idb('readwrite', st => st.delete(key)).catch(() => null);

/* ------------------------------------------------------------------ the player */
export class VidVerse {
  constructor(video) {
    this.isVideo = true; this.q = { name: 'video' }; this.adapted = 0;
    this.layout = { size: 1, x: 0, y: 0, spin: 1, bright: 1 }; this.health = 1; this.hueShift = 0; this.paused = false;
    // two layers so a colour change (or the sharper on-phone version arriving) cross-fades with no flash
    this.a = video; this.b = video.cloneNode(); this.b.id = 'bhv2'; this.b.removeAttribute('poster');
    video.after(this.b);
    [this.a, this.b].forEach(v => { v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.hidden = false; v.preload = 'auto'; });
    this.a.classList.add('on'); this.b.classList.remove('on');
    this.cur = this.a; this.src = ''; this.urls = new Map();
    this.boot = { w: innerWidth, h: innerHeight };
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cur.pause(); else if (!this.paused) this.play(this.cur); });
    // the background renderer only works when you aren't touching the phone
    this.lastInput = performance.now();
    const touch = () => { this.lastInput = performance.now(); };
    ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(e => addEventListener(e, touch, { passive: true, capture: true }));
    addEventListener('scroll', touch, { passive: true, capture: true });
    this.mode('home');
  }
  play(v) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }

  /* which file to show for the current colour: on-phone exact render → bundled render → nearest bundled + hue shift */
  async pick() {
    const id = store.s.theme, base = THEMES[id] || THEMES.nebula;
    const key = this.keyFor(base);
    const rec = await getLoop(key);
    if (rec && rec.blob) { this.show('idb:' + key, () => { if (!this.urls.has(key)) this.urls.set(key, URL.createObjectURL(rec.blob)); return this.urls.get(key); }, 0); return; }
    if (BUILTIN.has(id) && !base.custom) { this.show(BUNDLED + id + '.mp4', null, 0); }
    else {
      // custom colour: closest built-in until its own render is ready
      const h = hue(base.a1); let best = 'nebula', bd = 999;
      BUILTIN.forEach(k => { const d = Math.abs(hueDiff(hue(THEMES[k].a1), h)); if (d < bd) { bd = d; best = k; } });
      this.show(BUNDLED + best + '.mp4', null, hueDiff(h, hue(THEMES[best].a1)));
    }
    this.queue();
  }
  show(src, make, extraHue) {
    this.extraHue = extraHue || 0; this.paint();
    if (src === this.src) return;
    this.src = src;
    const url = make ? make() : src;
    const next = this.cur === this.a ? this.b : this.a;
    // keep the current frame position so the swap is invisible
    const t = this.cur.currentTime || 0;
    next.src = url;
    const go = () => {
      try { if (next.duration && isFinite(next.duration)) next.currentTime = t % next.duration; } catch (e) {}
      this.play(next);
      next.classList.add('on'); this.cur.classList.remove('on');
      const old = this.cur; this.cur = next;
      setTimeout(() => { if (old !== this.cur) { old.pause(); old.removeAttribute('src'); old.load(); } }, 900);
      document.documentElement.classList.add('gl-ready');
      this.paint();
    };
    next.addEventListener('loadeddata', go, { once: true });
    next.addEventListener('error', () => { if (src.startsWith('idb:')) { delLoop(src.slice(4)); this.src = ''; this.pick(); } }, { once: true });
    next.load();
  }
  keyFor(t) { const { W, H } = this.size(); return `${BAKE_V}|${themeKey(t)}|${W}x${H}`; }
  size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let w = this.boot.w * dpr, h = this.boot.h * dpr;
    const s = Math.min(1, 1920 / Math.max(w, h));              // hardware encoders/decoders are happiest ≤ 1920
    w = Math.round(w * s); h = Math.round(h * s);
    return { W: w - (w % 2), H: h - (h % 2) };
  }

  /* ---------------------------------------------------------------- silent background renders */
  queue() {
    if (this._queued) return; this._queued = true;
    setTimeout(() => this.runQueue(), 6000);                      // let the app settle after launch first
  }
  async runQueue() {
    try {
      if (localStorage.getItem('vv-bh-nobake') === String(BAKE_V)) return;
      // clean renders made for an old renderer version or a different screen size
      const { W, H } = this.size(), tail = `|${W}x${H}`;
      (await allKeys()).forEach(k => { if (!String(k).startsWith(BAKE_V + '|') || !String(k).endsWith(tail)) delLoop(k); });
      for (;;) {
        // current colour first, then every other built-in, then your custom ones
        const ids = [store.s.theme, ...BUILTIN_LIST, ...Object.keys(THEMES).filter(k => THEMES[k].custom)];
        let todo = null;
        for (const id of ids) { const t = THEMES[id]; if (!t) continue; if (!(await getLoop(this.keyFor(t)))) { todo = id; break; } }
        if (!todo) return;
        const ok = await this.bake(todo);
        if (ok === 'stop') return;
        if (todo === store.s.theme) this.pick();
        await sleep(4000);
      }
    } catch (e) { /* never disturb the app */ } finally { this._queued = false; }
  }
  async gate() {
    // wait until: app visible, untouched for 1.5 s, no payment / scanner on screen, screen size unchanged
    for (;;) {
      const busy = document.hidden || performance.now() - this.lastInput < 1500 || document.querySelector('.pay') || !(document.getElementById('scanner') || {}).hidden || this.paused;
      if (!busy) break;
      await sleep(400);
    }
    await new Promise(r => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 300 }) : setTimeout(r, 16)));
  }
  async bake(id) {
    const t = THEMES[id], key = this.keyFor(t), { W, H } = this.size();
    try {
      const [{ Universe }, { bakeLoop }] = await Promise.all([import('./universe.js'), import('./bhcore.js')]);
      const mem = navigator.deviceMemory || 4;
      const r = await bakeLoop(Universe, t, {
        W, H, seconds: 12, fps: 30, steps: 90, rt: 1, sky: mem >= 6 ? 'hi' : 'lo', bpp: 0.085,
        gate: () => this.gate(),
        abort: () => innerWidth !== this.boot.w || innerHeight !== this.boot.h,
      });
      await putLoop({ key, theme: id, blob: r.blob, mime: r.mime, W: r.W, H: r.H, at: Date.now() });
      return true;
    } catch (e) {
      const m = String(e && e.message || e);
      if (/no-encoder|no-avcC/.test(m)) { try { localStorage.setItem('vv-bh-nobake', String(BAKE_V)); } catch (x) {} return 'stop'; }
      if (/aborted/.test(m)) return 'stop';                       // screen changed size: try again next launch
      return false;
    }
  }

  /* ---------------------------------------------------------------- live tuning on top of the video (all GPU-cheap CSS) */
  paint() {
    const L = this.layout;
    const hot = Math.max(0, Math.min(1, (0.45 - this.health) / 0.45));
    const hs = (this.hueShift || 0) + (this.extraHue || 0) - hot * 18;
    const f = `hue-rotate(${hs.toFixed(1)}deg) saturate(${(1 + hot * 0.35).toFixed(2)}) brightness(${((L.bright || 1) * (0.94 + 0.08 * this.health)).toFixed(2)})`;
    const sc = Math.max(1, L.size || 1), room = (sc - 1) / 2 * 100;   // never move the video past its own edge
    [this.a, this.b].forEach(v => {
      const s = v.style;
      s.setProperty('--bh-f', f);
      s.setProperty('--bh-s', sc);
      s.setProperty('--bh-x', Math.max(-room, Math.min(room, (L.x || 0) * 30)).toFixed(1) + '%');
      s.setProperty('--bh-y', Math.max(-room, Math.min(room, (L.y || 0) * -30)).toFixed(1) + '%');
      v.classList.toggle('bh-filt', Math.abs(hs) > 0.5 || hot > 0.01 || Math.abs((L.bright || 1) - 1) > 0.01);
      try { v.playbackRate = Math.max(0.25, Math.min(2.5, L.spin || 1)); } catch (e) {}
    });
  }
  mode(m) { [this.a, this.b].forEach(v => { v.dataset.mode = m; }); }
  setTheme(t) {
    // time-of-day tint = small hue offset from the base colour; a different base colour = a different render
    const base = THEMES[store.s.theme] || THEMES.nebula;
    this.hueShift = t ? hueDiff(hue(t.a1), hue(base.a1)) : 0;
    const k = themeKey(base);
    if (k !== this._baseKey) { this._baseKey = k; this.pick(); } else this.paint();
  }
  setHealth(h) { const n = Math.round(h * 20) / 20; if (n !== this.health) { this.health = n; this.paint(); } }
  setLayout(l) { this.layout = Object.assign({}, this.layout, l || {}); this.paint(); }
  setWarp(w) { [this.a, this.b].forEach(v => v.classList.toggle('bh-warp', w > 0.05)); }
  pulse() { const v = this.cur; v.classList.remove('bh-pulse'); void v.offsetWidth; v.classList.add('bh-pulse'); clearTimeout(this._pt); this._pt = setTimeout(() => v.classList.remove('bh-pulse'), 900); }
  feed() { this.pulse(); }
  supernova() { this.pulse(); const f = document.createElement('div'); f.className = 'bh-nova'; document.body.appendChild(f); setTimeout(() => f.remove(), 1300); }
  intro(ms = 3000) { const v = this.cur; v.classList.add('bh-intro'); return new Promise(r => setTimeout(() => { v.classList.remove('bh-intro'); r(); }, ms)); }
  pause(p) { this.paused = !!p; if (p) this.cur.pause(); else this.play(this.cur); }
  hide(h) { [this.a, this.b].forEach(v => { v.style.visibility = h ? 'hidden' : ''; }); if (h) this.cur.pause(); else if (!this.paused) this.play(this.cur); }
  setFps() {} setRemaining() {} setGrain() {} setParallax() {} setConstellation() {} onLabels() {} spinSky() {}
  setCreature(c) { [this.a, this.b].forEach(v => { v.style.opacity = c === false ? '0' : ''; }); }
}
const BUILTIN_LIST = Object.keys(THEMES).filter(k => !THEMES[k].custom);
const BUILTIN = new Set(BUILTIN_LIST);

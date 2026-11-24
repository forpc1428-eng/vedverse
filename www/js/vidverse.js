// Vedverse — "Smooth" universe: the same ray-traced black hole, rendered once at full quality (scripts: bake) and played
// as a seamless video loop by the phone's video chip. Zero GPU ray-marching at runtime → no lag. Same API as Universe.
const BASE_HUE = 34;   // the baked disk colour (#f2a144)
function hue(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return BASE_HUE;
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return BASE_HUE;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
export class VidVerse {
  constructor(video) {
    this.v = video; this.isVideo = true; this.q = { name: 'video' }; this.adapted = 0;
    this.hueShift = 0; this.health = 1; this.layout = { size: 1, x: 0, y: 0, spin: 1, bright: 1 };
    const v = video;
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.src = 'assets/space/blackhole.webm';
    v.hidden = false;
    const ready = () => document.documentElement.classList.add('gl-ready');
    v.addEventListener('playing', ready, { once: true });
    v.addEventListener('loadeddata', () => { this.play(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (!this.paused) this.play(); });
    this.play();
    this.mode('home');
  }
  play() { const p = this.v.play(); if (p && p.catch) p.catch(() => {}); }
  paint() {
    const L = this.layout, s = this.v.style;
    const hot = Math.max(0, Math.min(1, (0.45 - this.health) / 0.45));
    const hs = this.hueShift - hot * 18;
    s.setProperty('--bh-f', `hue-rotate(${hs.toFixed(1)}deg) saturate(${(1 + hot * 0.35).toFixed(2)}) brightness(${((L.bright || 1) * (0.92 + 0.12 * this.health)).toFixed(2)})`);
    s.setProperty('--bh-s', Math.max(1, L.size || 1));
    s.setProperty('--bh-x', ((L.x || 0) * 30).toFixed(1) + '%');
    s.setProperty('--bh-y', ((L.y || 0) * -30).toFixed(1) + '%');
    this.v.playbackRate = Math.max(0.25, Math.min(2.5, L.spin || 1));
    this.v.classList.toggle('bh-filt', Math.abs(hs) > 0.5 || hot > 0.01 || Math.abs((L.bright || 1) - 1) > 0.01);
  }
  mode(m) { this.v.dataset.mode = m; }
  setTheme(t) { const d = hue(t && t.a1) - BASE_HUE; this.hueShift = ((d + 540) % 360) - 180; this.paint(); }
  setHealth(h) { const n = Math.round(h * 20) / 20; if (n !== this.health) { this.health = n; this.paint(); } }
  setLayout(l) { this.layout = Object.assign({}, this.layout, l || {}); this.paint(); }
  setWarp(w) { this.v.classList.toggle('bh-warp', w > 0.05); }
  pulse() { const v = this.v; v.classList.remove('bh-pulse'); void v.offsetWidth; v.classList.add('bh-pulse'); clearTimeout(this._pt); this._pt = setTimeout(() => v.classList.remove('bh-pulse'), 900); }
  feed() { this.pulse(); }
  supernova() {
    this.pulse();
    const f = document.createElement('div'); f.className = 'bh-nova'; document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
  intro(ms = 3000) { this.v.classList.add('bh-intro'); return new Promise(r => setTimeout(() => { this.v.classList.remove('bh-intro'); r(); }, ms)); }
  pause(p) { this.paused = !!p; if (p) this.v.pause(); else this.play(); }
  setFps() {} setRemaining() {} setGrain() {} setParallax() {} setCreature(c) { this.v.style.visibility = c === false ? 'hidden' : ''; }
  setConstellation() {} onLabels() {} spinSky() {}
}

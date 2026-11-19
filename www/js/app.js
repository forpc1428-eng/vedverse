// ============================================================================
//  VEDVERSE — main controller
// ============================================================================
import { store, stats, paid, sum, daily, money, compact, timeAgo, exportJSON, exportCSV, importData, seedDemo, DAY, startOfDay, rangeStart } from './store.js';
import { icon, LOGO } from './icons.js';
import { CATALOG, renderWidget, renderCustom, METRICS, RANGES, DISPLAYS, ring, bars, donut } from './widgets.js';
import * as UPI from './upi.js';
import * as Scanner from './scanner.js';
import { payload as hwPayload, openStudio } from './homewidgets.js';
import { openReceive, openSplit, openBills, markBillPaid, openIdentity } from './tools.js';
import { greeting, logEvent, getLoc, timelineHTML, initAutoConfirm, onAutoPaid, scheduleReminders, biometricUnlock, onToggle, renderReceipt, openReceiptStyles, openStatement, openIncome, monthIncome, openThemeBuilder, todTheme, openTodEditor, openDockEditor, DOCK_OPTS, setLanguage, LANG_NAMES } from './extras.js';
import { haptic, sfx, shatter, confetti, playMonth } from './fx.js';
import { initNotify, onResume as notifResume, settingsRows as notifRows, statusRow as notifStatusRow, refreshStatus as notifRefresh, NOTIF_KEYS, onNotifSetting, openNotifStudio, allow as notifAllow, test as notifTest } from './notify.js';

export const THEMES = {
  // deep, realistic palettes — `temp` is the accretion disk's inner temperature (K), yaw/pitch pick which part of the sky you see
  nebula: { name: 'Event Horizon', bg0: '#020307', bg1: '#0b1020', a1: '#f2a144', a2: '#a9dcff', a3: '#ffd29a', hot: '#fff3dc', temp: 6400, yaw: 0, pitch: 0 },
  aurora: { name: 'Pulsar', bg0: '#01060a', bg1: '#06161c', a1: '#5eead4', a2: '#c7f9ff', a3: '#93c5fd', hot: '#eefcff', temp: 10500, yaw: 0.9, pitch: 0.05 },
  ember: { name: 'Red Giant', bg0: '#060203', bg1: '#170807', a1: '#ff7a3d', a2: '#ffc48a', a3: '#ff4d3d', hot: '#ffe6cc', temp: 3900, yaw: -0.7, pitch: -0.04 },
  abyss: { name: 'Quasar', bg0: '#01030a', bg1: '#070b1f', a1: '#7aa2ff', a2: '#dbe7ff', a3: '#b49cff', hot: '#f2f6ff', temp: 16000, yaw: 2.2, pitch: 0.08 },
  sakura: { name: 'Nova', bg0: '#060306', bg1: '#160a12', a1: '#ff9eb5', a2: '#ffe0e8', a3: '#ffb37a', hot: '#fff1f4', temp: 5200, yaw: -1.6, pitch: 0 },
  cyber: { name: 'Magnetar', bg0: '#030208', bg1: '#0e0a1e', a1: '#c4a1ff', a2: '#8ee8f5', a3: '#f0b8ff', hot: '#ffffff', temp: 12500, yaw: 3.1, pitch: -0.06 },
  mono: { name: 'Void', bg0: '#030303', bg1: '#111113', a1: '#c8c8cc', a2: '#ffffff', a3: '#8a8a90', hot: '#ffffff', temp: 7000, sat: 0, yaw: 1.4, pitch: 0.03 },
  // more disk colours — same hole, the accretion light is tinted
  solar: { name: 'Solar Flare', bg0: '#050302', bg1: '#161004', a1: '#fbbf24', a2: '#fde68a', a3: '#fb923c', hot: '#fffbeb', temp: 6000, tint: '#ffcf5a', yaw: 0.45, pitch: 0.02 },
  emerald: { name: 'Emerald', bg0: '#010604', bg1: '#05160f', a1: '#34d399', a2: '#a7f3d0', a3: '#5eead4', hot: '#ecfdf5', temp: 7800, tint: '#4dffa6', yaw: -0.35, pitch: 0.04 },
  violet: { name: 'Violet Nebula', bg0: '#04020a', bg1: '#120a26', a1: '#a78bfa', a2: '#ddd6fe', a3: '#f0abfc', hot: '#f5f3ff', temp: 9500, tint: '#a67cff', yaw: 1.1, pitch: -0.03 },
  crimson: { name: 'Crimson', bg0: '#070203', bg1: '#1c0609', a1: '#f43f5e', a2: '#fecdd3', a3: '#fb7185', hot: '#fff1f2', temp: 4600, tint: '#ff3b4f', yaw: -1.2, pitch: 0.02 },
  glacier: { name: 'Glacier', bg0: '#01050a', bg1: '#06131f', a1: '#67e8f9', a2: '#e0f2fe', a3: '#93c5fd', hot: '#f0f9ff', temp: 15000, tint: '#8be9ff', yaw: 2.6, pitch: 0.05 },
  rosegold: { name: 'Rose Gold', bg0: '#060304', bg1: '#1a0e0f', a1: '#f4a6a0', a2: '#fde2d6', a3: '#e8b4a0', hot: '#fff5f0', temp: 5200, tint: '#ffb09a', yaw: -2.0, pitch: -0.02 },
  teal: { name: 'Cosmic Teal', bg0: '#010506', bg1: '#051516', a1: '#2dd4bf', a2: '#99f6e4', a3: '#38bdf8', hot: '#f0fdfa', temp: 9000, tint: '#38f0d8', yaw: 1.8, pitch: 0.06 },
  inferno: { name: 'Inferno', bg0: '#070301', bg1: '#1d0b02', a1: '#ff7a1a', a2: '#ffd0a1', a3: '#ef4444', hot: '#fff7ed', temp: 3600, tint: '#ff6a1a', yaw: -0.9, pitch: -0.05 },
  magenta: { name: 'Magenta Pulsar', bg0: '#060207', bg1: '#1a0619', a1: '#e879f9', a2: '#f5d0fe', a3: '#c084fc', hot: '#fdf4ff', temp: 10000, tint: '#f070ff', yaw: 3.0, pitch: 0.03 },
  pearl: { name: 'Stardust', bg0: '#040404', bg1: '#14120f', a1: '#e5c07b', a2: '#f5f3ee', a3: '#c8b6a6', hot: '#fffaf0', temp: 5600, sat: 0.6, yaw: -2.5, pitch: 0.02 },
};
const KEYWORDS = { food: /canteen|chai|tea|coffee|snack|food|lunch|dinner|breakfast|maggi|pizza|burger|juice|mess|zomato|swiggy/i, study: /assign|print|xerox|book|notes|stationery|pen|project|lab|fees|exam/i, travel: /auto|cab|bus|metro|uber|ola|rapido|petrol|train|ticket/i, shop: /amazon|flipkart|myntra|shop|cloth|shoe/i, bills: /recharge|bill|wifi|electric|rent/i, fun: /movie|game|party|netflix|spotify/i, health: /medic|pharma|doctor|gym/i, friends: /friend|split|treat|bro/i };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const root = document.documentElement;

let U = null;            // three.js universe
let current = 'home';
let editing = false;
let skyMode = false;
let histFilter = 'all', histQuery = '', histView = 'list', histAdv = {};
let statPeriod = 'month';
const stack = [];        // overlay stack for back button

/* =========================================================================
   Theme + appearance
   ========================================================================= */
const FONT_LIST = ['Sora', 'Inter', 'Space Grotesk', 'Unbounded', 'JetBrains Mono', 'Poppins', 'Manrope', 'Outfit', 'DM Sans', 'Plus Jakarta Sans', 'Urbanist', 'Lexend', 'Rubik', 'Nunito', 'Montserrat', 'Orbitron', 'Exo 2', 'Audiowide', 'Playfair Display', 'Cormorant Garamond', 'Righteous', 'Space Mono', 'Quicksand', 'Comfortaa', 'Baloo 2'];
const hexRgb = h => { const m = String(h || '#0b1020').replace('#', '').match(/.{2}/g) || ['0b', '10', '20']; return m.slice(0, 3).map(x => parseInt(x, 16)).join(','); };
function applyDock() {
  const items = $$('.dock-item');
  (store.s.dock || ['home', 'history', 'stats', 'settings']).slice(0, 4).forEach((k, i) => {
    const b = items[i]; if (!b) return; const o = DOCK_OPTS[k] || DOCK_OPTS.home;
    b.dataset.go = o[2] === 'go' ? k : ''; b.dataset.dact = o[2] === 'act' ? k : '';
    b.innerHTML = icon(o[1]) + `<span>${o[0]}</span>`; b.classList.toggle('on', !!b.dataset.go && b.dataset.go === current);
  });
  try { moveBlob(); } catch (e) {}
}
function applyAppearance() {
  const s = store.s;
  Object.keys(THEMES).forEach(k => { if (THEMES[k].custom && !(s.customThemes || {})[k]) delete THEMES[k]; });
  Object.assign(THEMES, s.customThemes || {});
  const t = THEMES[s.theme] || THEMES.nebula;
  ['bg0', 'bg1', 'a1', 'a2', 'a3', 'hot'].forEach(k => root.style.setProperty('--' + k, t[k]));
  root.style.setProperty('--r', s.radius + 'px');
  root.style.setProperty('--blur', s.blur + 'px');
  root.classList.toggle('light', !!t.light);
  ['grotesk', 'unbounded', 'mono'].forEach(f => root.classList.toggle('font-' + f, s.font === f));
  root.classList.toggle('liquid', !!s.liquid);
  root.classList.toggle('no-grain', !s.grain);
  root.classList.toggle('no-labels', !s.dockLabels);
  root.classList.toggle('reduced', !!s.reducedMotion);
  const m = $('meta[name=theme-color]'); if (m) m.content = t.bg0;
  if (s.fontFamily) { root.style.setProperty('--font-d', `'${s.fontFamily}',system-ui,sans-serif`); root.style.setProperty('--font-b', `'${s.fontFamily}',system-ui,sans-serif`); }
  else { root.style.removeProperty('--font-d'); root.style.removeProperty('--font-b'); }
  root.style.setProperty('--fs', s.fontScale || 1);
  root.classList.toggle('bold', !!s.fontBold);
  if (s.accent) root.style.setProperty('--a1', s.accent);
  root.style.setProperty('--ga', ((s.glass == null ? 60 : s.glass) / 100).toFixed(2));
  root.style.setProperty('--g-rgb', hexRgb(t.bg1));
  root.classList.toggle('grain-on', !!s.grain);
  ['calm', 'snappy', 'none'].forEach(x => root.classList.toggle('anim-' + x, s.animSpeed === x));
  setLanguage(s.lang);
  applyDock();
  if (U) { U.setTheme(todTheme(t)); U.setCreature(s.creature); U.setParallax(s.parallax); U.setGrain(s.grain); U.setLayout && U.setLayout({ size: +s.bhSize || 1, x: +s.bhX || 0, y: +s.bhY || 0, spin: s.bhSpin == null ? 1 : +s.bhSpin, bright: s.bhBright == null ? 1 : +s.bhBright }); }
  $('#brandLogo').innerHTML = LOGO(34, 'tb');
  $('#privacyBtn').innerHTML = icon(s.hideAmounts ? 'eyeOff' : 'eye');
}

/* =========================================================================
   Universe
   ========================================================================= */
async function initUniverse() {
  if (!store.s.three) { root.classList.add('no3d'); $('#gl').style.display = 'none'; return; }
  try {
    const { Universe } = await import('./universe.js');
    U = new Universe($('#gl'), { quality: store.s.quality, particles: store.s.particles, parallax: store.s.parallax, creature: store.s.creature });
    U.setTheme(THEMES[store.s.theme] || THEMES.nebula);
    U.setGrain(store.s.grain);
    window.__vvU = U;
    root.classList.add('gl3d');   // film grain + vignette now live inside the WebGL composite (free), not a CSS overlay
    U.onLabels(renderLabels);
    U.mode('home');
  } catch (e) {
    console.warn('3D unavailable', e);
    U = null; root.classList.add('no3d'); $('#gl').style.display = 'none';
  }
}
function syncUniverse() {
  if (!U) return;
  const s = stats();
  U.setHealth(s.health);
  U.setRemaining(store.s.monthlyBudget ? s.remaining / store.s.monthlyBudget : 1);
}

/* =========================================================================
   Toasts + sheets + overlay stack
   ========================================================================= */
function toast(msg, ic = 'spark', ms = 2400) {
  const box = $('#toasts');
  const same = [...box.children].find(t => !t.classList.contains('out') && t.dataset.msg === msg);
  if (same) { clearTimeout(same._t); same._t = setTimeout(() => { same.classList.add('out'); setTimeout(() => same.remove(), 400); }, ms); return; }
  [...box.children].filter(t => !t.classList.contains('out')).slice(0, -1).forEach(t => { t.classList.add('out'); setTimeout(() => t.remove(), 400); });
  const el = document.createElement('div');
  el.dataset.msg = msg;
  el.className = 'toast glass';
  el.innerHTML = icon(ic) + `<span>${msg}</span>`;
  box.appendChild(el);
  el._t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}
function pushStack(close) { const e = { close }; stack.push(e); setTimeout(fpsPolicy, 0); return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); setTimeout(fpsPolicy, 0); }; }

function openSheet(html, { onMount, onClose, tall, key } = {}) {
  key = key || ((html.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
  const open = key && [...$$('#sheets .sheet-wrap')].find(w => !w._closed && w.dataset.key === key);
  if (open) {
    const sh = $('.sheet', open); sh.classList.remove('nudge'); void sh.offsetWidth; sh.classList.add('nudge'); haptic('tick');
    onClose && setTimeout(() => onClose(undefined), 0);   // duplicate request resolves empty, the open one stays in charge
    return { el: sh, close: open._close };
  }
  const wrap = document.createElement('div');
  if (key) wrap.dataset.key = key;
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet glass sheet-glass" style="${tall ? 'min-height:80vh' : ''}"><div class="grab"></div>${html}</div>`;
  $('#sheets').appendChild(wrap);
  const sheet = $('.sheet', wrap), bg = $('.sheet-bg', wrap);
  let closed = false;
  const unstack = pushStack(() => close());
  function close(val) {
    if (closed) return; closed = true; wrap._closed = true; unstack();
    sheet.classList.add('closing'); bg.classList.add('closing');
    sfx.close();
    setTimeout(() => wrap.remove(), 340);
    onClose && onClose(val);
  }
  wrap._close = close;
  bg.addEventListener('click', () => close());
  // swipe down to dismiss
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => { if (sheet.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sheet.addEventListener('touchmove', e => { if (y0 === null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { sheet.style.transform = `translateY(${dy}px)`; sheet.style.transition = 'none'; } }, { passive: true });
  sheet.addEventListener('touchend', () => { if (y0 === null) return; sheet.style.transition = ''; if (dy > 110) close(); else sheet.style.transform = ''; y0 = null; });
  sfx.open(); haptic('soft');
  onMount && onMount(sheet, close);
  return { el: sheet, close };
}

function confirmSheet(title, sub, okLabel = 'Confirm', danger = false) {
  return new Promise(res => {
    let v = false;
    openSheet(`<h3>${title}</h3><p class="sub">${sub}</p><div class="btn-row"><button class="btn press" data-c="0">Cancel</button><button class="btn press ${danger ? 'danger' : 'primary'}" data-c="1">${okLabel}</button></div>`, {
      onMount(el, close) { $$('[data-c]', el).forEach(b => b.onclick = () => { v = b.dataset.c === '1'; close(); }); },
      onClose() { res(v); },
    });
  });
}

/* =========================================================================
   Navigation
   ========================================================================= */
// universe frame budget: full 60 fps on Home / sky view, 30 behind card-heavy screens, sheets and while scrolling
let scrolling = false, scrollT = 0;
function fpsPolicy() {
  if (!U) return;
  const covered = current !== 'home' && !(current === 'history' && skyMode);
  U.setFps(scrolling || covered || document.querySelector('#sheets .sheet-wrap') ? 30 : 60);
}
function go(name, opts = {}) {
  if (editing && name !== 'home') toggleEdit(false);
  const prev = current;
  current = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  $$('.dock-item').forEach(b => b.classList.toggle('on', b.dataset.go === name));
  moveBlob();
  render(name);
  if (U) U.mode(name === 'home' ? 'home' : (name === 'history' && skyMode) ? 'sky' : 'side');
  fpsPolicy();
  if (prev !== name) { haptic('tick'); sfx.tick(); const sc = $('#s-' + name); if (sc && !opts.keepScroll) sc.scrollTop = 0; }
  $('#editBtn').style.visibility = name === 'home' ? '' : 'hidden';
}
function moveBlob() {
  const on = $('.dock-item.on'), blob = $('#dockBlob'), dock = $('#dock');
  if (!on) { blob.style.opacity = 0; return; }
  // layout boxes (offset*) ignore the press/scale transforms, so the pill always lands dead-centre
  if (!dock.offsetWidth) return;
  const w = Math.min(70, on.offsetWidth - 6);
  const left = on.offsetLeft + (on.offsetWidth - w) / 2;
  const prevLeft = blob.style.left === '' ? left : parseFloat(blob.style.left) + (parseFloat(blob.style.width) - w) / 2 || left;
  const stretch = Math.min(40, Math.abs(left - prevLeft) * 0.35);  // liquid stretch, kept centred
  blob.style.opacity = 1;
  blob.style.width = (w + stretch) + 'px';
  blob.style.left = (left - stretch / 2) + 'px';
  clearTimeout(moveBlob.t);
  moveBlob.t = setTimeout(() => { blob.style.width = w + 'px'; blob.style.left = left + 'px'; }, 180);
}
function render(name = current) {
  if (name === 'home') renderHome();
  else if (name === 'history') renderHistory();
  else if (name === 'stats') renderStats();
  else if (name === 'settings') renderSettings();
}

/* =========================================================================
   HOME
   ========================================================================= */
function renderHome() {
  const s = stats(), st = store.s;
  const pct = st.monthlyBudget ? s.month / st.monthlyBudget : 0;
  const pillCls = pct > 1 ? 'bad' : pct > 0.8 ? 'warn' : '';
  const first = store.data.firstRun && store.data.tx.length === 0;
  const widgets = store.data.widgets.map((w, i) => renderWidget(w, editing).replace('class="widget', `style="--i:${i}" class="widget`)).join('');
  $('#s-home').innerHTML = `
    <div class="hero" id="hero">
      ${greeting() ? `<div class="hero-greet">${greeting()}</div>` : ''}<div class="hero-kicker">Spent this month</div>
      <div class="hero-amt num">${money(s.month)}<small>/ ${compact(st.monthlyBudget)}</small></div>
      <div class="hero-pills">
        <span class="pill glass ${pillCls}"><span class="dot"></span>${money(Math.floor(s.allowance))}/day safe</span>
        <span class="pill glass">${icon('bolt')} ${money(s.today)} today</span>
      </div>
    </div>
    ${first ? `<div class="welcome glass"><h4>Welcome to your universe, ${esc(st.name)} ✨</h4><p>At the centre of your universe is a black hole. Its disk burns bright and calm when you spend well, and flickers when the month runs hot. Every payment becomes a star in your sky.</p><div class="btn-row"><button class="btn primary press" data-act="scan">${icon('scan')} Scan your first QR</button></div></div>` : ''}
    <div class="section-h"><h3>${editing ? 'Drag to rearrange' : 'Your widgets'}</h3><button data-act="${editing ? 'done-edit' : 'gallery'}">${editing ? icon('check') + ' Done' : icon('plus') + ' Add'}</button></div>
    <div class="grid ${editing ? 'editing' : ''}" id="wgrid">${widgets}${editing ? `<button class="add-widget press" data-act="gallery">${icon('plus')} Add widget</button>` : ''}</div>
  `;
  syncUniverse();
}

function toggleEdit(v = !editing) {
  editing = v; haptic(v ? 'heavy' : 'tap');
  $('#editBtn').innerHTML = icon(v ? 'check' : 'grid');
  renderHome();
}

// drag-to-reorder
function bindWidgetDrag() {
  let drag = null, startY = 0, startX = 0, lpTimer = null;
  document.addEventListener('pointerdown', e => {
    const w = e.target.closest('.widget'); if (!w || !w.closest('#wgrid')) return;
    if (e.target.closest('.w-x,.w-e,button.chip,.fav')) return;
    startX = e.clientX; startY = e.clientY;
    if (!editing) { lpTimer = setTimeout(() => { lpTimer = null; toggleEdit(true); }, 520); return; }
    drag = $(`.widget[data-wid="${w.dataset.wid}"]`, $('#wgrid'));
    drag.classList.add('dragging'); drag.setPointerCapture && drag.setPointerCapture(e.pointerId);
    haptic('tap');
  });
  document.addEventListener('pointermove', e => {
    if (lpTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) { clearTimeout(lpTimer); lpTimer = null; }
    if (!drag) return;
    drag.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    drag.style.pointerEvents = '';
    const t = under && under.closest('.widget');
    if (t && t !== drag && t.parentNode === drag.parentNode) {
      const all = $$('.widget', drag.parentNode);
      const di = all.indexOf(drag), ti = all.indexOf(t);
      if (di < ti) t.after(drag); else t.before(drag);
      haptic('tick');
    }
  });
  const end = () => {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    if (!drag) return;
    drag.classList.remove('dragging');
    const order = $$('.widget', $('#wgrid')).map(el => el.dataset.wid);
    store.data.widgets.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    store.save(); drag = null;
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}

function openGallery() {
  const present = new Set(store.data.widgets.map(w => w.type));
  const items = Object.entries(CATALOG).map(([k, d]) => `<button class="gallery-item press ${present.has(k) ? 'added' : ''}" data-add="${k}"><span class="gi">${icon(d.ic)}</span><span class="grow"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></span><span class="tag">${d.size === 's' ? '1×1' : '2×1'}</span></button>`).join('');
  const customs = store.data.customWidgets.map(c => `<button class="gallery-item press" data-addc="${c.id}"><span class="gi">${esc(c.icon || '✦')}</span><span class="grow"><b>${esc(c.title)}</b><small>Custom · ${METRICS[c.metric]} · ${RANGES[c.range]}</small></span><span class="tag">custom</span></button>`).join('');
  openSheet(`<h3>Widgets</h3><p class="sub">${Object.keys(CATALOG).length} built-in widgets, plus your own. Tap to add.</p>
    <button class="opt press" data-build="1">${icon('plus')}<span><b>Create custom widget</b><small>Pick a metric, range, category, style, size and colour</small></span></button>
    ${customs ? `<div class="set-group"><h5>${icon('spark')} Your custom widgets</h5>${customs}</div>` : ''}
    <div class="set-group"><h5>${icon('grid')} Built-in</h5>${items}</div>`, {
    tall: true,
    onMount(el, close) {
      el.addEventListener('click', e => {
        const a = e.target.closest('[data-add]'), c = e.target.closest('[data-addc]'), b = e.target.closest('[data-build]');
        if (a) { store.data.widgets.push({ id: store.newId(), type: a.dataset.add }); store.save(); a.classList.add('added'); toast(`Added “${CATALOG[a.dataset.add].name}”`, 'check'); haptic('success'); renderHome(); }
        if (c) { store.data.widgets.push({ id: store.newId(), type: 'custom', ref: c.dataset.addc }); store.save(); toast('Custom widget added', 'check'); renderHome(); }
        if (b) { close(); setTimeout(() => openBuilder(), 250); }
      });
    },
  });
}

function openBuilder(existingId) {
  const ex = store.data.customWidgets.find(c => c.id === existingId);
  const cfg = ex ? { ...ex } : { id: store.newId(), title: 'Chai fund', icon: '☕', metric: 'sum', range: 'month', cat: 'food', display: 'meter', size: 's', target: 500, color: THEMES[store.s.theme].a2 };
  const colors = ['#8b5cf6', '#22d3ee', '#f472b6', '#10b981', '#f97316', '#fbbf24', '#ef4444', '#3b82f6', '#a3e635', '#ffffff'];
  const chips = (key, map) => `<div class="w-chips">${Object.entries(map).map(([k, v]) => `<button class="chip ${String(cfg[key]) === k ? 'on' : ''}" data-k="${key}" data-v="${k}">${v}</button>`).join('')}</div>`;
  const cats = { all: 'All', ...Object.fromEntries(store.data.categories.map(c => [c.id, c.icon + ' ' + c.name])) };
  const html = () => `<h3>${ex ? 'Edit' : 'Create'} widget</h3><p class="sub">Live preview updates as you build.</p>
    <div class="builder-prev" id="bprev"></div>
    <div class="form-row"><label>Title & icon</label><div class="btn-row"><input class="field" id="bTitle" value="${esc(cfg.title)}" style="flex:3"><input class="field center" id="bIcon" value="${esc(cfg.icon)}" maxlength="4" style="flex:1"></div></div>
    <div class="form-row"><label>Metric</label>${chips('metric', METRICS)}</div>
    <div class="form-row"><label>Time range</label>${chips('range', RANGES)}</div>
    <div class="form-row"><label>Category</label>${chips('cat', cats)}</div>
    <div class="form-row"><label>Style</label>${chips('display', DISPLAYS)}</div>
    <div class="form-row"><label>Size</label>${chips('size', { s: 'Small 1×1', w: 'Wide 2×1' })}</div>
    <div class="form-row"><label>Target (for ring / bar / budget left)</label><input class="field" id="bTarget" type="number" inputmode="decimal" value="${cfg.target || ''}"></div>
    <div class="form-row"><label>Glass tint</label><div class="swatches">${colors.map(c => `<button class="swatch ${cfg.color === c ? 'on' : ''}" style="--c:${c}" data-col="${c}"></button>`).join('')}</div></div>
    <div class="btn-row mt">${ex ? `<button class="btn danger press" id="bDel">${icon('trash')} Delete</button>` : ''}<button class="btn primary press" id="bSave">${icon('check')} ${ex ? 'Save' : 'Add to home'}</button></div>`;
  openSheet(html(), {
    tall: true,
    onMount(el, close) {
      const prev = () => { $('#bprev', el).innerHTML = `<div class="widget glass size-${cfg.size} custom" style="--tint:${cfg.color}"><div class="w-shine"></div>${renderCustom(cfg)}</div>`; };
      prev();
      el.addEventListener('click', e => {
        const c = e.target.closest('[data-k]'), col = e.target.closest('[data-col]');
        if (c) { cfg[c.dataset.k] = c.dataset.v; $$(`[data-k="${c.dataset.k}"]`, el).forEach(b => b.classList.toggle('on', b === c)); haptic('tick'); prev(); }
        if (col) { cfg.color = col.dataset.col; $$('[data-col]', el).forEach(b => b.classList.toggle('on', b === col)); prev(); }
      });
      ['bTitle', 'bIcon', 'bTarget'].forEach(id => $('#' + id, el).addEventListener('input', () => { cfg.title = $('#bTitle', el).value; cfg.icon = $('#bIcon', el).value; cfg.target = +$('#bTarget', el).value || 0; prev(); }));
      $('#bSave', el).onclick = () => {
        if (ex) Object.assign(ex, cfg); else { store.data.customWidgets.push(cfg); store.data.widgets.push({ id: store.newId(), type: 'custom', ref: cfg.id }); }
        store.save(); haptic('success'); close(); renderHome(); toast(ex ? 'Widget updated' : 'Widget added to home', 'check');
      };
      const del = $('#bDel', el);
      if (del) del.onclick = () => { store.data.customWidgets = store.data.customWidgets.filter(c => c.id !== cfg.id); store.data.widgets = store.data.widgets.filter(w => w.ref !== cfg.id); store.save(); close(); renderHome(); };
    },
  });
}

/* =========================================================================
   HISTORY
   ========================================================================= */
function renderHistory() {
  const el = $('#s-history');
  const cats = store.data.categories;
  const filters = [['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ...cats.map(c => [c.id, c.icon + ' ' + c.name])];
  let list = store.data.tx.filter(t => {
    if (histFilter === 'paid' || histFilter === 'pending') { if (t.status !== histFilter) return false; }
    else if (histFilter === 'failed') { if (t.status !== 'failed' && t.status !== 'cancelled') return false; }
    else if (histFilter !== 'all' && t.cat !== histFilter) return false;
    if (histQuery) { const q = histQuery.toLowerCase(); if (!((t.pn || '') + ' ' + (t.pa || '') + ' ' + (t.note || '') + ' ' + t.am + ' ' + (t.app || '') + ' ' + ((t.loc && t.loc.place) || '') + ' ' + store.cat(t.cat).name).toLowerCase().includes(q)) return false; }
    if (histAdv.from && t.ts < histAdv.from) return false; if (histAdv.to && t.ts > histAdv.to) return false;
    if (histAdv.min && +t.am < histAdv.min) return false; if (histAdv.max && +t.am > histAdv.max) return false;
    if (histAdv.app && t.app !== histAdv.app) return false;
    return true;
  });
  const groups = {};
  list.forEach(t => { const d = startOfDay(t.ts); (groups[d] = groups[d] || []).push(t); });
  const today = startOfDay();
  const dayLabel = d => d === today ? 'Today' : d === today - DAY ? 'Yesterday' : new Date(+d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  let i = 0;
  const body = Object.keys(groups).sort((a, b) => b - a).map(d => {
    const items = groups[d];
    const tot = sum(items.filter(t => t.status === 'paid'));
    return `<div class="day-h"><span>${dayLabel(+d)}</span><span class="num">${money(tot)}</span></div><div class="list glass">${items.map(t => txRow(t, i++)).join('')}</div>`;
  }).join('');
  const hadSearchFocus = document.activeElement && document.activeElement.id === 'histSearch';
  el.classList.toggle('sky-mode', skyMode);
  el.innerHTML = `
    <div class="seg glass" id="histSeg"><div class="seg-k"></div><button class="${!skyMode && histView !== 'timeline' ? 'on' : ''}" data-sky="0">${icon('list')} List</button><button class="${histView === 'timeline' && !skyMode ? 'on' : ''}" data-sky="2">${icon('history')} Timeline</button><button class="${skyMode ? 'on' : ''}" data-sky="1">${icon('sky')} Sky</button></div>
    <div class="hist-list">
      <div class="hist-tools"><label class="search glass">${icon('search')}<input id="histSearch" placeholder="Search name, UPI ID, note, amount, place" value="${esc(histQuery)}"></label><button class="icon-btn glass press ${Object.keys(histAdv).length ? 'act' : ''}" data-act="histfilter" aria-label="Filters">${icon('layers')}</button><button class="icon-btn glass press" data-act="statement" aria-label="PDF">${icon('download')}</button></div>
      ${histView === 'timeline' ? '' : `<div class="chips-row">${filters.map(([k, v]) => `<button class="chip ${histFilter === k ? 'on' : ''}" data-hf="${k}">${v}</button>`).join('')}</div>`}
      ${histView === 'timeline' ? timelineHTML(histQuery) : (body || `<div class="empty"><div class="big-e">🌌</div>No payments here yet.<br>Every payment becomes a star.</div>`)}
    </div>
    <div class="sky-hint">Drag to spin · each star is someone you paid · brighter = more often</div>`;
  segKnob($('#histSeg'));
  if (hadSearchFocus) { const s = $('#histSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  if (skyMode && U) buildSky();
}
function openHistFilter() {
  const iso = ts => ts ? new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '';
  openSheet(`<h3>Filters</h3><p class="sub">Narrow your history. Combine with search.</p>
    <div class="tool-row"><div class="form-row"><label>From</label><input class="field" type="date" id="hfFrom" value="${iso(histAdv.from)}"></div><div class="form-row"><label>To</label><input class="field" type="date" id="hfTo" value="${iso(histAdv.to)}"></div></div>
    <div class="tool-row"><div class="form-row"><label>Min amount</label><input class="field" id="hfMin" inputmode="decimal" value="${histAdv.min || ''}"></div><div class="form-row"><label>Max amount</label><input class="field" id="hfMax" inputmode="decimal" value="${histAdv.max || ''}"></div></div>
    <div class="form-row"><label>Paid with</label><div class="chips-row">${[['', 'Any app']].concat(UPI.APPS.map(a => [a.id, a.name])).map(([k, n]) => `<button class="chip ${(histAdv.app || '') === k ? 'on' : ''}" data-hfa="${k}">${n}</button>`).join('')}</div></div>
    <div class="btn-row mt"><button class="btn press" id="hfClear">Clear</button><button class="btn primary press" id="hfOk">${icon('check')} Apply</button></div>`, {
    onMount(el, close) {
      let app = histAdv.app || '';
      el.addEventListener('click', e => { const a = e.target.closest('[data-hfa]'); if (a) { app = a.dataset.hfa; el.querySelectorAll('[data-hfa]').forEach(x => x.classList.toggle('on', x === a)); } });
      $('#hfClear', el).onclick = () => { histAdv = {}; close(); renderHistory(); };
      $('#hfOk', el).onclick = () => { const f = $('#hfFrom', el).value, t = $('#hfTo', el).value; histAdv = {}; if (f) histAdv.from = new Date(f + 'T00:00:00').getTime(); if (t) histAdv.to = new Date(t + 'T23:59:59').getTime(); if (+$('#hfMin', el).value) histAdv.min = +$('#hfMin', el).value; if (+$('#hfMax', el).value) histAdv.max = +$('#hfMax', el).value; if (app) histAdv.app = app; close(); renderHistory(); };
    },
  });
}
function txRow(t, i = 0) {
  const c = store.cat(t.cat);
  return `<div class="tx" data-tx="${t.id}" style="--i:${Math.min(i, 20)}"><div class="av" style="--c:${c.color}">${c.icon}</div><div class="grow"><b>${esc(t.pn || t.pa || 'Payment')}</b><small>${new Date(t.ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · ${esc(t.note || c.name)}</small></div><div class="amt"><b class="num">${money(t.am)}</b><span class="status ${t.status}">${t.status}</span></div></div>`;
}
// knobs re-measure whenever their segment changes size (fonts loading, language switch, rotation)
const segRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => segKnob(e.target))) : null;
function segKnob(seg) {
  if (!seg) return;
  if (segRO && !seg._ro) { seg._ro = 1; segRO.observe(seg); }
  requestAnimationFrame(() => { const on = $('button.on', seg), k = $('.seg-k', seg); if (!on || !k) return; k.style.left = on.offsetLeft + 'px'; k.style.width = on.offsetWidth + 'px'; });
}
function buildSky() {
  const nodes = Object.values(store.data.payees).filter(p => p.count > 0).map(p => ({ key: p.pa, label: p.pn || p.pa, color: store.cat(p.cat).color, weight: p.total, cat: p.cat, count: p.count, total: p.total }));
  U.setConstellation(nodes);
}
const labelPool = [];
function renderLabels(list) {
  const host = $('#labels');
  if (!skyMode || current !== 'history') list = [];
  while (labelPool.length < list.length) { const d = document.createElement('div'); d.className = 'star-l'; host.appendChild(d); labelPool.push(d); }
  const placed = [];
  const order = list.map((n, i) => i).sort((a, b) => (list[b].weight || 0) - (list[a].weight || 0));
  const show = new Set();
  order.forEach(i => { const n = list[i]; if (!n.front) return; if (placed.some(p => Math.abs(p.x - n.x) < 84 && Math.abs(p.y - n.y) < 34)) return; placed.push(n); show.add(i); });
  labelPool.forEach((d, i) => {
    const n = list[i];
    if (!n || !show.has(i)) { d.style.display = 'none'; return; }
    d.style.display = '';
    if (d.dataset.k !== n.key) { d.dataset.k = n.key; d.innerHTML = `${esc(n.label)}<small>${n.count}× · ${compact(n.total)}</small>`; }
    d.style.left = n.x + 'px'; d.style.top = n.y + 'px';
    d.style.opacity = (n.o * Math.max(0.25, Math.min(1, 16 / n.depth))).toFixed(2);
  });
}

/* =========================================================================
   STATS / INSIGHTS
   ========================================================================= */
function periodRange(p) {
  const now = Date.now();
  if (p === 'week') { const f = rangeStart('week'); return { from: f, prevFrom: f - 7 * DAY, prevTo: f, days: 7 }; }
  if (p === 'year') { const f = rangeStart('year'); const d = new Date(f); return { from: f, prevFrom: new Date(d.getFullYear() - 1, 0, 1).getTime(), prevTo: f, days: 365 }; }
  if (p === 'all') return { from: 0, prevFrom: 0, prevTo: 0, days: 0 };
  const f = rangeStart('month'); const d = new Date(f); return { from: f, prevFrom: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), prevTo: f, days: 30 };
}
function renderStats() {
  const R = periodRange(statPeriod);
  const list = store.data.tx.filter(t => t.status === 'paid' && t.ts >= R.from);
  const prev = R.prevTo ? store.data.tx.filter(t => t.status === 'paid' && t.ts >= R.prevFrom && t.ts < R.prevTo) : [];
  const total = sum(list), ptotal = sum(prev);
  const change = ptotal ? (total - ptotal) / ptotal : 0;
  const byCat = {}; list.forEach(t => byCat[t.cat] = (byCat[t.cat] || 0) + (+t.am));
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const byPayee = {}; list.forEach(t => { const k = t.pa || t.pn || '—'; byPayee[k] = byPayee[k] || { n: t.pn || t.pa, v: 0, c: 0, cat: t.cat }; byPayee[k].v += +t.am; byPayee[k].c++; });
  const payees = Object.values(byPayee).sort((a, b) => b.v - a.v).slice(0, 5);
  let chart = '';
  if (statPeriod === 'year' || statPeriod === 'all') {
    const months = []; const d = new Date();
    for (let i = 11; i >= 0; i--) { const s = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime(), e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime(); months.push({ v: sum(store.data.tx.filter(t => t.status === 'paid' && t.ts >= s && t.ts < e)), l: 'JFMAMJJASOND'[new Date(s).getMonth()] }); }
    chart = bars(months.map(m => m.v), 110, months.map(m => m.l));
  } else {
    const n = statPeriod === 'week' ? 7 : 30; const dd = daily(n);
    chart = bars(dd.map(x => x.v), 110, dd.map((x, i) => n === 7 ? 'SMTWTFS'[new Date(x.ts).getDay()] : (i % 5 === 0 ? new Date(x.ts).getDate() : '')));
  }
  const s = stats();
  $('#s-stats').innerHTML = `
    <div class="seg glass" id="statSeg"><div class="seg-k"></div>${['week', 'month', 'year', 'all'].map(p => `<button class="${statPeriod === p ? 'on' : ''}" data-sp="${p}">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}</div>
    ${store.s.income ? `<div class="card glass inc-card press" data-act="income"><div><small>Money in this month</small><b class="num" style="color:var(--good)">+${money(monthIncome())}</b></div><div><small>Net</small><b class="num">${money(monthIncome() - stats().month)}</b></div>${icon('plus')}</div>` : ''}
    <div class="stat-hero glass"><div class="hero-kicker">Total spent</div><div class="num">${money(total)}</div>
      <div class="hero-pills mt"><span class="pill glass ${change > 0.1 ? 'bad' : change < -0.05 ? '' : 'warn'}"><span class="dot"></span>${R.prevTo ? (change >= 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(change * 100)) + '% vs last' : 'All time'}</span><span class="pill glass">${list.length} payments</span><span class="pill glass">avg ${money(list.length ? total / list.length : 0, { dec: 0 })}</span></div></div>
    <div class="card glass"><h4>Spending rhythm</h4>${chart}</div>
    <div class="card glass"><h4>By category ${cats.length ? donut(cats.map(([k, v]) => ({ v, color: store.cat(k).color })), 46, 7) : ''}</h4>
      ${cats.length ? cats.map(([k, v]) => { const c = store.cat(k); return `<div class="cat-row" style="--c:${c.color}"><span style="width:26px">${c.icon}</span><span style="width:90px;font-size:13px;font-weight:600">${esc(c.name)}</span><div class="bar-h"><i style="--p:${v / (cats[0][1] || 1)}"></i></div><b class="num" style="font-size:13px;min-width:62px;text-align:right">${money(v, { dec: 0 })}</b></div>`; }).join('') : '<div class="w-empty">Nothing yet</div>'}</div>
    <div class="card glass"><h4>Top payees</h4>${payees.length ? payees.map(p => { const c = store.cat(p.cat); return `<div class="w-row" style="margin:10px 0"><div class="av" style="--c:${c.color}">${esc((p.n || '?')[0].toUpperCase())}</div><div class="grow"><b>${esc(p.n)}</b><small>${p.c} payments</small></div><b class="num">${money(p.v, { dec: 0 })}</b></div>`; }).join('') : '<div class="w-empty">Nothing yet</div>'}</div>
    <div class="stat-grid">
      <div class="stat-card glass"><small>Forecast this month</small><b class="num">${compact(s.forecast)}</b><div class="w-sub ${s.forecast > store.s.monthlyBudget ? 'bad' : 'good'}">${s.forecast > store.s.monthlyBudget ? 'Over budget pace' : 'On track'}</div></div>
      <div class="stat-card glass"><small>Safe to spend today</small><b class="num">${money(Math.floor(s.allowance))}</b><div class="w-sub">${s.daysLeft} days left</div></div>
    </div>
    <div class="card glass"><h4>Sound of your month ${icon('music')}</h4><p class="muted tiny">Every payment is a note: bigger amounts play higher, and each category has its own instrument. Overspent weeks sound chaotic.</p>
      <div class="viz" id="viz">${Array.from({ length: 32 }, () => '<i></i>').join('')}</div>
      <button class="play-btn press mt" id="playMonth">${icon('play')} Play my month</button></div>`;
  segKnob($('#statSeg'));
}

/* =========================================================================
   SETTINGS
   ========================================================================= */
const PAYMODE_DESC = { smart: 'Leaves signed merchant QRs untouched, fills in the amount for everything else, and retries automatically if the app declines.', original: 'Always opens the QR exactly as scanned. You type the amount in your UPI app.', noamount: 'Never pre-fills the amount. It is copied so you can paste it in the app.', always: 'Always injects the amount, even into merchant QRs. Not recommended.' };
let setPage = null, setQuery = '';
const SETTINGS = () => [
  { id: 'appearance', h: 'Appearance', ic: 'palette', d: 'Theme, fonts, colours, glass', rows: [
    { t: 'theme' },
    { t: 'btn', label: 'Theme builder', sub: 'Make your own disk colour, accents and sky', act: 'themebuilder' },
    ...(store.s.customThemes && store.s.customThemes[store.s.theme] ? [{ t: 'btn', label: 'Edit current theme', sub: (store.s.customThemes[store.s.theme] || {}).name, act: 'themeedit' }] : []),
    { t: 'h', label: 'Text' },
    { t: 'fonts' },
    { k: 'fontScale', t: 'slider', label: 'Text size', min: 0.85, max: 1.25, step: 0.05, unit: '×' },
    { k: 'fontBold', t: 'toggle', label: 'Bolder text' },
    { t: 'h', label: 'Colour & glass' },
    { k: 'accent', t: 'color', label: 'Accent colour', sub: 'Overrides the theme accent' },
    { k: 'glass', t: 'slider', label: 'Glass strength', min: 0, max: 100, step: 5, unit: '%' },
    { k: 'radius', t: 'slider', label: 'Corner roundness', min: 8, max: 36, step: 1, unit: 'px' },
    { k: 'blur', t: 'slider', label: 'Button frost', min: 0, max: 44, step: 1, unit: 'px' },
    { k: 'grain', t: 'toggle', label: 'Film grain', sub: 'Off = crystal-clear UI' },
    { k: 'dockLabels', t: 'toggle', label: 'Dock labels' },
  ] },
  { id: 'universe', h: 'Universe', ic: 'cube', d: 'Black hole, 3D, time of day', rows: [
    { k: 'three', t: 'toggle', label: 'Live 3D universe', sub: 'Turn off to save the most battery', reload: true },
    { k: 'creature', t: 'toggle', label: 'Black hole', sub: 'Burns bright when you spend well, flickers when you overspend' },
    { k: 'quality', t: 'seg', label: 'Render quality', opts: { auto: 'Auto', low: 'Low', med: 'Med', high: 'Ultra' }, reload: true },
    { t: 'h', label: 'Black hole' },
    { k: 'bhSize', t: 'slider', label: 'Size', min: 0.6, max: 1.6, step: 0.05, unit: '×' },
    { k: 'bhY', t: 'slider', label: 'Height', min: -0.4, max: 0.3, step: 0.02, unit: '' },
    { k: 'bhX', t: 'slider', label: 'Left / right', min: -0.5, max: 0.5, step: 0.02, unit: '' },
    { k: 'bhSpin', t: 'slider', label: 'Disk spin speed', min: 0, max: 3, step: 0.1, unit: '×' },
    { k: 'bhBright', t: 'slider', label: 'Disk brightness', min: 0.4, max: 1.8, step: 0.05, unit: '×' },
    { t: 'h', label: 'Sky & motion' },
    { k: 'timeOfDay', t: 'toggle', label: 'Time of day', sub: 'The disk light shifts with the hour' },
    { t: 'btn', label: 'Time-of-day colours', sub: 'Pick a colour for morning, day, evening and night', act: 'tod' },
    { k: 'particles', t: 'slider', label: 'Star density', min: 0.3, max: 1.6, step: 0.1, unit: '×', reload: true },
    { k: 'parallax', t: 'toggle', label: 'Gyro parallax', sub: 'Tilt your phone to look around' },
    { k: 'intro', t: 'toggle', label: 'Warp intro (first launch only)' },
    { k: 'reducedMotion', t: 'toggle', label: 'Reduce motion' },
  ] },
  { id: 'home', h: 'Home & widgets', ic: 'grid', d: 'Greetings, dock, widgets, app icon', rows: [
    { k: 'greetings', t: 'toggle', label: 'Greetings', sub: 'Changes with time, weekday, festivals and your spending' },
    { k: 'greetStyle', t: 'seg', label: 'Greeting style', opts: { all: 'All', day: 'Time', festival: 'Festive', mood: 'Mood' } },
    { t: 'btn', label: 'Customise dock', sub: 'Choose the 4 buttons around Scan', act: 'dockedit' },
    { t: 'btn', label: 'In-app widgets', sub: 'Add, remove, resize: tap Edit on Home', act: 'editwidgets' },
    { t: 'h', label: 'Home screen' },
    { t: 'studio' },
    { k: 'widgetsFollowTheme', t: 'toggle', label: 'Widgets follow app theme', sub: 'Off = each widget keeps its own colours' },
    { t: 'identity' },
  ] },
  { id: 'payments', h: 'Payments', ic: 'bolt', d: 'Apps, auto-confirm, keypad, receipts, income', rows: [
    { k: 'askApp', t: 'toggle', label: 'Ask which app every time' },
    { k: 'payOutside', t: 'toggle', label: 'Open UPI app separately', sub: 'On: GPay / PhonePe opens as its own app (switch back from recents). Off: it opens on top of Vedverse and success is confirmed automatically.' },
    { k: 'defaultApp', t: 'app', label: 'Default payment app' },
    { k: 'myVpa', t: 'text', label: 'Your UPI ID (to receive money)' },
    { t: 'h', label: 'Auto-confirm' },
    { k: 'autoConfirm', t: 'toggle', label: 'From the UPI app’s reply', sub: 'Android reports success or failure back' },
    { t: 'h', label: 'Pay screen' },
    { k: 'recentPayees', t: 'toggle', label: 'Recent payees', sub: 'One tap to pay someone again' },
    { k: 'calcKeypad', t: 'toggle', label: 'Calculator keys', sub: '120+45 pays ₹165' },
    { k: 'showQuickAmounts', t: 'toggle', label: 'Quick amount chips' },
    { k: 'quickAmounts', t: 'list', label: 'Quick amounts', num: true },
    { k: 'showQuickNotes', t: 'toggle', label: 'Quick note chips' },
    { k: 'quickNotes', t: 'list', label: 'Quick notes' },
    { k: 'breath', t: 'toggle', label: 'Hold-to-pay', sub: 'Big amounts need a 1.6 s hold' },
    { k: 'breathAbove', t: 'number', label: 'Hold required above' },
    { t: 'h', label: 'Receipts & effects' },
    { k: 'receipt', t: 'toggle', label: 'Receipt after paying' },
    { t: 'btn', label: 'Receipt style', sub: '22 universe styles', act: 'receiptstyle' },
    { k: 'shatter', t: 'toggle', label: 'Glass shatter effect' },
    { k: 'portal', t: 'toggle', label: 'Portal effect' },
    { k: 'confettiOnSuccess', t: 'toggle', label: 'Confetti on success' },
    { t: 'h', label: 'Money in' },
    { k: 'income', t: 'toggle', label: 'Income tracking', sub: 'Salary, pocket money, refunds' },
    { t: 'btn', label: 'Add or view money in', act: 'income' },
    { t: 'h', label: 'Advanced' },
    { k: 'payMode', t: 'seg', label: 'Payment link mode', opts: { smart: 'Smart', original: 'Original', noamount: 'No amt', always: 'Force' }, sub: PAYMODE_DESC[store.s.payMode] },
    { k: 'amountFormat', t: 'seg', label: 'Amount sent to app', opts: { decimal: '50.00', plain: '50' } },
    { k: 'noteToApp', t: 'toggle', label: 'Send note to UPI app' },
  ] },
  { id: 'scanner', h: 'Scanner', ic: 'scan', d: 'Engine, launch, sound', rows: [
    { k: 'scanEngine', t: 'seg', label: 'Scan engine', opts: { auto: 'Auto', native: 'ML Kit', web: 'Web' } },
    { k: 'scanOnLaunch', t: 'toggle', label: 'Open scanner on launch' },
    { k: 'scanBeep', t: 'toggle', label: 'Lock sound' },
    { k: 'scanVibrate', t: 'toggle', label: 'Lock vibration' },
  ] },
  { id: 'budget', h: 'Budget & goals', ic: 'target', d: 'Budget, goal, categories', rows: [
    { k: 'name', t: 'text', label: 'Your name' },
    { k: 'monthlyBudget', t: 'number', label: 'Monthly budget' },
    { k: 'dailyBudget', t: 'number', label: 'Daily budget' },
    { k: 'goalName', t: 'text', label: 'Savings goal' },
    { k: 'goalAmount', t: 'number', label: 'Goal amount' },
    { k: 'goalSaved', t: 'number', label: 'Saved so far' },
    { t: 'cats' },
  ] },
  { id: 'history', h: 'History & data', ic: 'layers', d: 'Timeline, location, PDF, backup', rows: [
    { k: 'timeline', t: 'toggle', label: 'Full timeline', sub: 'Every scan, payment, receipt and change with exact time' },
    { k: 'locLog', t: 'toggle', label: 'Precise location', sub: 'Adds where it happened. Stored only on this phone.' },
    { t: 'btn', label: 'PDF statement', sub: 'Any date range, made on your phone', act: 'statement' },
    { t: 'data' },
  ] },
  { id: 'notify', h: 'Notifications', ic: 'alert', d: 'Reminders, nudges, tone, quiet hours, studio', rows: notifRows() },
  { id: 'sound', h: 'Sound & touch', ic: 'sound', d: 'Sounds, haptics, animation speed', rows: [
    { k: 'sounds', t: 'toggle', label: 'Interface sounds' },
    { k: 'soundPack', t: 'seg', label: 'Sound pack', opts: { cosmic: 'Cosmic', minimal: 'Minimal', crystal: 'Crystal', retro: 'Retro', deep: 'Deep', synth: 'Synth' } },
    { k: 'music', t: 'toggle', label: 'Sound Money', sub: 'Each payment plays its own note' },
    { k: 'haptics', t: 'toggle', label: 'Haptics' },
    { k: 'hapticStrength', t: 'seg', label: 'Haptic strength', opts: { light: 'Light', normal: 'Normal', strong: 'Strong' } },
    { k: 'animSpeed', t: 'seg', label: 'Animation speed', opts: { calm: 'Calm', normal: 'Normal', snappy: 'Snappy', none: 'None' } },
  ] },
  { id: 'security', h: 'Security', ic: 'lock', d: 'Lock, fingerprint, privacy', rows: [
    { k: 'hideAmounts', t: 'toggle', label: 'Hide amounts', sub: 'Also from the eye button at the top' },
    { k: 'lock', t: 'toggle', label: 'App lock (PIN)' },
    { t: 'pin' },
    { k: 'biometric', t: 'toggle', label: 'Fingerprint / face unlock', sub: 'PIN stays as a backup' },
  ] },
  { id: 'lang', h: 'Language & format', ic: 'font', d: 'Language, numbers, currency', rows: [
    { t: 'lang' },
    { k: 'numFormat', t: 'seg', label: 'Number format', opts: { indian: '1,00,000', intl: '100,000', compact: '1L / 12K' } },
    { k: 'decimals', t: 'seg', label: 'Decimals', opts: { auto: 'Auto', always: 'Always', never: 'Never' } },
    { k: 'currency', t: 'seg', label: 'Currency symbol', opts: { '₹': '₹', '$': '$', '€': '€', '£': '£' } },
    { k: 'weekStart', t: 'seg', label: 'Week starts on', opts: { 1: 'Monday', 0: 'Sunday' }, num: true },
  ] },
];
function renderSettings() {
  const s = store.s;
  const row = r => {
    const v = s[r.k];
    switch (r.t) {
      case 'theme': return `<div class="row col"><div class="lbl"><b>Theme</b><small>Each theme re-paints the whole universe</small></div><div class="themes mt">${Object.entries(THEMES).map(([k, t]) => `<button class="theme-sw press ${s.theme === k ? 'on' : ''}" data-theme="${k}" style="background:radial-gradient(circle at 30% 25%,${t.a2},transparent 55%),radial-gradient(circle at 75% 75%,${t.a3},transparent 55%),linear-gradient(135deg,${t.a1},${t.bg1} 70%,${t.bg0})"><span>${t.name}</span></button>`).join('')}</div></div>`;
      case 'toggle': return `<div class="row" data-tg="${r.k}"><div class="lbl"><b>${r.label}</b>${r.sub ? `<small>${r.sub}</small>` : ''}</div><div class="sw ${v ? 'on' : ''}"></div></div>`;
      case 'seg': return `<div class="row col"><div class="lbl"><b>${r.label}</b>${r.sub ? `<small id="sub-${r.k}">${r.sub}</small>` : ''}</div><div class="seg glass mt${Object.keys(r.opts).length > 4 ? ' many' : ''}" data-segk="${r.k}" data-num="${r.num ? 1 : ''}" data-reload="${r.reload ? 1 : ''}"><div class="seg-k"></div>${Object.entries(r.opts).map(([k, l]) => `<button class="${String(v) === k ? 'on' : ''}" data-sv="${esc(k)}">${l}</button>`).join('')}</div></div>`;
      case 'slider': return `<div class="row col"><div class="lbl" style="display:flex;justify-content:space-between"><b>${r.label}</b><span class="val" id="val-${r.k}">${v}${r.unit}</span></div><input type="range" class="slider" data-sl="${r.k}" data-unit="${r.unit}" data-reload="${r.reload ? 1 : ''}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" style="--p:${(v - r.min) / (r.max - r.min) * 100}%"></div>`;
      case 'number': return `<div class="row"><div class="lbl"><b>${r.label}</b></div><input type="number" inputmode="decimal" class="sm" data-in="${r.k}" data-num="1" value="${v}"></div>`;
      case 'text': return `<div class="row"><div class="lbl"><b>${r.label}</b></div><input type="text" class="sm" style="width:150px" data-in="${r.k}" value="${esc(v)}"></div>`;
      case 'list': return `<div class="row col"><div class="lbl"><b>${r.label}</b><small>Comma separated</small></div><input type="text" class="mt" data-list="${r.k}" data-num="${r.num ? 1 : ''}" value="${esc(v.join(', '))}"></div>`;
      case 'app': { const a = UPI.APPS.find(x => x.id === v); return `<div class="row press" data-act="pick-default"><div class="lbl"><b>${r.label}</b><small>${s.askApp ? 'Ask every time is on' : 'Used for one-tap paying'}</small></div><span class="val">${a ? a.name : 'None'}</span>${icon('chevron', 'chev')}</div>`; }
      case 'cats': return `<div class="row col"><div class="lbl"><b>Categories</b><small>Tap × to remove. Add your own below.</small></div><div class="w-chips mt">${store.data.categories.map(c => `<button class="chip" data-delcat="${c.id}">${c.icon} ${esc(c.name)} ✕</button>`).join('')}</div><div class="btn-row mt"><input class="field" id="newCatIcon" placeholder="🎯" maxlength="4" style="flex:0 0 64px;text-align:center"><input class="field" id="newCatName" placeholder="New category" style="flex:1"><button class="btn press" data-act="addcat">${icon('plus')}</button></div></div>`;
      case 'pin': return `<div class="row press" data-act="set-pin"><div class="lbl"><b>${s.pin ? 'Change PIN' : 'Set PIN'}</b><small>${s.pin ? '4-digit PIN is set' : 'Required for app lock'}</small></div>${icon('chevron', 'chev')}</div>`;
      case 'identity': return `<div class="row col"><div class="lbl"><b>Home-screen icon & name</b><small>77 icons (36 ray-traced black holes + 40 unique designs) and 100 names, including fancy fonts</small></div><button class="btn primary press mt" data-act="identity">${icon('spark')} Choose icon & name</button></div>`;
      case 'studio': return `<div class="row col"><div class="lbl"><b>Widget Studio</b><small>26 animated home-screen widgets: orbit rings, twinkling stars, sliding cards. Design new ones visually or as code.</small></div><button class="btn primary press mt" data-act="studio">${icon('grid')} Open Widget Studio</button></div>`;
      case 'notifstatus': return notifStatusRow();
      case 'chips': return `<div class="row col"><div class="lbl"><b>${r.label}</b>${r.sub ? `<small>${r.sub}</small>` : ''}</div><div class="font-grid mt" data-segk="${r.k}">${Object.entries(r.opts).map(([k, l]) => `<button class="font-chip press ${String(v) === k ? 'on' : ''}" data-sv="${esc(k)}">${l}</button>`).join('')}</div></div>`;
      case 'h': return `<div class="set-sub">${r.label}</div>`;
      case 'btn': return `<div class="row press" data-act="${r.act}"><div class="lbl"><b>${r.label}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>${icon('chevron', 'chev')}</div>`;
      case 'color': return `<div class="row"><div class="lbl"><b>${r.label}</b>${r.sub ? `<small>${r.sub}</small>` : ''}</div><input type="color" class="set-color" data-color="${r.k}" value="${v || (THEMES[s.theme] || THEMES.nebula).a1}">${v ? `<button class="chip" data-color-clear="${r.k}">Reset</button>` : ''}</div>`;
      case 'fonts': return `<div class="row col"><div class="lbl"><b>Font</b><small>${FONT_LIST.length} fonts, all inside the app</small></div><div class="font-grid mt">${[''].concat(FONT_LIST).map(f => `<button class="font-chip press ${(s.fontFamily || '') === f ? 'on' : ''}" data-font="${esc(f)}" style="${f ? `font-family:'${f}'` : ''}">${f ? esc(f) : 'Theme default'}</button>`).join('')}</div></div>`;
      case 'lang': return `<div class="row col"><div class="lbl"><b>Language</b><small>Main screens are translated; everything works offline</small></div><div class="font-grid mt">${Object.entries(LANG_NAMES).map(([k, n]) => `<button class="font-chip press ${s.lang === k ? 'on' : ''}" data-lang="${k}">${n}</button>`).join('')}</div></div>`;
      case 'data': return `<div class="row col"><div class="btn-row"><button class="btn press" data-act="export-json">${icon('download')} JSON</button><button class="btn press" data-act="export-csv">${icon('download')} CSV</button><button class="btn press" data-act="import">${icon('upload')} Import</button></div><div class="btn-row mt"><button class="btn danger press" data-act="reset">${icon('trash')} Reset all</button></div><input type="file" id="importInput" accept=".json,.csv,application/json,text/csv" hidden><small class="muted tiny mt">${store.data.tx.length} transactions saved on this device only. Nothing ever leaves your phone.</small></div>`;
    }
    return '';
  };
  const cats = SETTINGS();
  const el = $('#s-settings');
  const search = `<label class="search glass set-search">${icon('search')}<input id="setSearch" placeholder="Search settings" value="${esc(setQuery)}" autocomplete="off"></label>`;
  if (setQuery.trim()) {
    const q = setQuery.trim().toLowerCase();
    const hits = cats.map(c => ({ c, rows: c.rows.filter(r => r.t !== 'h' && ((r.label || '') + ' ' + (r.sub || '') + ' ' + (r.k || '') + ' ' + r.t + ' ' + c.h).toLowerCase().includes(q)) })).filter(x => x.rows.length);
    el.innerHTML = search + (hits.length ? hits.map(x => `<div class="set-group"><h5>${icon(x.c.ic)} ${x.c.h}</h5><div class="set-list glass">${x.rows.map(row).join('')}</div></div>`).join('') : `<div class="empty">Nothing matches “${esc(setQuery)}”</div>`);
  } else if (setPage === 'features') {
    const all = []; cats.forEach(c => c.rows.forEach(r => { if (r.t === 'toggle' && !all.find(x => x.k === r.k)) all.push({ ...r, sub: c.h + (r.sub ? ' · ' + r.sub : '') }); }));
    el.innerHTML = `<div class="set-top"><button class="icon-btn glass press" data-setback>${icon('back')}</button><h3>Features</h3></div><p class="sub set-p">Every feature in one place. Turn anything on or off.</p><div class="set-list glass">${all.map(row).join('')}</div>`;
  } else if (setPage) {
    const c = cats.find(x => x.id === setPage) || cats[0];
    el.innerHTML = `<div class="set-top"><button class="icon-btn glass press" data-setback>${icon('back')}</button><h3>${c.h}</h3></div><div class="set-list glass">${c.rows.map(row).join('')}</div>`;
  } else {
    el.innerHTML = search + `<div class="set-cats">${cats.map(c => `<button class="set-cat glass press" data-setcat="${c.id}"><span class="set-ic">${icon(c.ic)}</span><span class="set-ct"><b>${c.h}</b><small>${c.d}</small></span>${icon('chevron', 'chev')}</button>`).join('')}
      <button class="set-cat glass press" data-setcat="features"><span class="set-ic">${icon('spark')}</span><span class="set-ct"><b>Features</b><small>Every on/off switch in one list</small></span>${icon('chevron', 'chev')}</button></div>` +
      `<div class="about">${LOGO(56, 'ab')}<div><b style="font-family:var(--font-d);font-size:16px;color:var(--text)">Vedverse</b> · v2.0</div><div>Crafted for Vedant · Works fully offline. Payments happen in your UPI app; Vedverse never touches your money or bank details.</div></div>`;
  }
  if (document.activeElement && document.activeElement.id === 'setSearch') {} else if (setQuery) { const i = $('#setSearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  $$('#s-settings .seg').forEach(segKnob);
  if (setPage === 'notify') notifRefresh();
}

/* =========================================================================
   SCANNER
   ========================================================================= */
let scanCtl = null, scanOpts = {}, scanLocked = false, scanStart = 0, scanAutoZoom = true, zoomNow = 1;
const RET = ['tl', 'tr', 'br', 'bl'];
const TORCH_NEXT = { auto: 'on', on: 'off', off: 'auto' };
function setRet(pts, size) {
  const r = $('#scanRet'); r.style.setProperty('--s', size + 'px');
  RET.forEach((k, i) => { const c = $('.' + k, r); c.style.setProperty('--x', pts[i].x + 'px'); c.style.setProperty('--y', pts[i].y + 'px'); });
}
// idle guide: a soft square in the middle — purely visual, the whole frame is scanned
function retIdle() {
  const W = innerWidth, H = innerHeight, s = Math.min(W * 0.62, 280), cx = W / 2, cy = H * 0.46;
  setRet([{ x: cx - s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy + s / 2 }], 42);
}
// a QR can be held at any angle: assign its 4 corners to the screen's tl/tr/br/bl brackets
function orderCorners(c) {
  const cx = c.reduce((a, p) => a + p.x, 0) / c.length, cy = c.reduce((a, p) => a + p.y, 0) / c.length;
  const P = c.map(p => ({ x: p.x, y: p.y, a: Math.atan2(p.y - cy, p.x - cx) }));
  const used = new Set();
  return [-0.75, -0.25, 0.25, 0.75].map(t => {
    t *= Math.PI; let best = 0, bd = 1e9;
    P.forEach((p, i) => { if (used.has(i)) return; const d = Math.abs(Math.atan2(Math.sin(p.a - t), Math.cos(p.a - t))); if (d < bd) { bd = d; best = i; } });
    used.add(best); return P[best];
  });
}
function paintTorch(mode, lit) {
  const b = $('#scanTorch'); b.dataset.mode = mode; b.dataset.lit = lit ? '1' : '0';
  $('span', b).textContent = mode === 'auto' ? (lit ? 'Auto · on' : 'Auto') : mode === 'on' ? 'On' : 'Off';
}
function paintZoom(z) {
  zoomNow = z;
  $$('#scanZooms [data-z]').forEach(b => { const v = b.dataset.z; b.classList.toggle('on', v === 'auto' ? scanAutoZoom : (!scanAutoZoom && Math.abs(+v - z) < 0.3)); });
  const a = $('#scanZooms .auto'); if (a) a.textContent = scanAutoZoom && z > 1.05 ? `AUTO ${z.toFixed(1)}×` : 'AUTO';
}
function manualZoom(z) {
  if (!scanCtl || !scanCtl.caps.zoom) return;
  const zc = scanCtl.caps.zoom; z = Math.max(zc.min || 1, Math.min(zc.max, z));
  if (scanAutoZoom) { scanAutoZoom = false; scanCtl.setAutoZoom(false); }
  scanCtl.zoom(z); paintZoom(z);
}
async function openScanner(opts = {}) {
  const sc = $('#scanner');
  if (!sc.hidden) return;
  scanOpts = opts; scanLocked = false; scanAutoZoom = true; zoomNow = 1;
  sc.hidden = false; sc.classList.remove('locked');
  $('.lock-chip') && $('.lock-chip').remove();
  $('#scanQuad polygon').setAttribute('points', '');
  retIdle();
  $('#scanHint').textContent = opts.amount ? `Scan to pay ${money(opts.amount, { force: true })}` : 'Point anywhere at a UPI or Bharat QR';
  $('#scanBadge').textContent = ''; $('#scanBadge').style.visibility = 'hidden';
  $('#scanTorch').style.visibility = 'hidden';
  const torchMode = store.s.scanTorch || 'auto';
  paintTorch(torchMode, false);
  const unstack = pushStack(() => closeScanner());
  sc._unstack = unstack;
  if (U) U.pause(true);
  haptic('tap'); sfx.open();
  window.__vv_scanEngine = store.s.scanEngine;
  scanStart = performance.now();
  scanCtl = await Scanner.start($('#scanVideo'), onScanResult, (e) => {
    $('#scanBadge').textContent = 'Camera unavailable'; $('#scanBadge').style.visibility = '';
    $('#scanHint').innerHTML = 'Allow camera access, or use <b>Gallery</b> / <b>Paste</b> / <b>UPI ID</b> below';
    console.warn(e);
  }, {
    torch: torchMode, vibrate: !!store.s.scanVibrate, autoZoom: true,
    onZoom: (z) => paintZoom(z),
    onTorch: (on) => paintTorch(store.s.scanTorch || 'auto', on),
  });
  if (!scanCtl) return;
  if (sc.hidden) { scanCtl.stop(); scanCtl = null; return; } // closed while starting
  $('#scanBadge').style.visibility = 'hidden';   // clean camera: no status text while scanning
  if (scanCtl.caps.torch) $('#scanTorch').style.visibility = 'visible';
  const zc = scanCtl.caps.zoom;
  if (zc && zc.max > 1.05) {
    // zoom pill removed: auto-zoom, pinch and double-tap remain
    $$('#scanZooms [data-z]').forEach(b => { b.hidden = b.dataset.z === 'auto' ? !scanCtl.caps.autoZoom : +b.dataset.z > zc.max + 0.01; });
    if (!scanCtl.caps.autoZoom) scanAutoZoom = false;
    paintZoom(1);
  }
}
async function closeScanner() {
  const sc = $('#scanner');
  if (sc._unstack) { sc._unstack(); sc._unstack = null; }
  if (scanCtl) { const c = scanCtl; scanCtl = null; await c.stop(); }
  sc.hidden = true;
  if (U) U.pause(false);
}
function onScanResult(text, info = {}) {
  if (scanLocked) return;
  if ($('#sheets .sheet-wrap')) { if (scanCtl) setTimeout(() => scanCtl && scanCtl.resume && scanCtl.resume(), 700); return; }
  const parsed = UPI.parseQR(text);
  const ms = info.ms != null ? info.ms : Math.round(performance.now() - scanStart);
  if ((!parsed || parsed.type !== 'upi') && text === onScanResult._lastBad && Date.now() - onScanResult._lastBadT < 6000) {
    onScanResult._lastBadT = Date.now();
    if (scanCtl) setTimeout(() => scanCtl && scanCtl.resume && scanCtl.resume(), 900);
    return;
  }
  if (store.s.scanVibrate && info.engine !== 'ML Kit') haptic('scan');   // native already buzzed on the decode frame
  sfx.scan();
  if (!parsed || parsed.type !== 'upi') {
    onScanResult._lastBad = text; onScanResult._lastBadT = Date.now();
    logEvent('scan-other', { title: 'Scanned a QR (not a payment)', sub: String(text).slice(0, 90) });
    toast(parsed && parsed.type === 'unsupported' ? parsed.reason : 'This QR isn’t a UPI payment code', 'alert', 2200);
    retIdle();
    if (scanCtl) setTimeout(() => scanCtl && scanCtl.resume && scanCtl.resume(), 1400);
    return;
  }
  scanLocked = true;
  logEvent('scan', { title: `Scanned ${parsed.pn || parsed.pa}`, sub: parsed.pa, amt: parsed.am ? +parsed.am : undefined });
  const sc = $('#scanner');
  if (scanCtl && scanCtl.frameTo) scanCtl.frameTo($('#scanFreeze'));
  let cx = innerWidth / 2, cy = innerHeight * 0.46;
  if (info.corners && info.corners.length === 4) {
    const c = orderCorners(info.corners);
    const side = Math.max(18, Math.min(42, Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y) * 0.3));
    setRet(c, side);
    $('#scanQuad polygon').setAttribute('points', c.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    cx = c.reduce((a, p) => a + p.x, 0) / 4; cy = c.reduce((a, p) => a + p.y, 0) / 4;
  }
  sc.classList.add('locked');
  // green corners snap onto the QR; no text
  setTimeout(async () => { await closeScanner(); openPay(parsed, { amount: scanOpts.amount }); }, 260);
}
function showTextResult(raw) {
  openSheet(`<h3>QR content</h3><p class="sub">This isn’t a UPI payment code.</p><div class="field" style="word-break:break-all;min-height:60px">${esc(raw)}</div><div class="btn-row mt"><button class="btn press" id="cpy">${icon('copy')} Copy</button>${/^https?:\/\//.test(raw) ? `<a class="btn primary press" href="${esc(raw)}" target="_blank" rel="noopener">${icon('share')} Open link</a>` : ''}</div>`, {
    onMount(el) { $('#cpy', el).onclick = () => { UPI.copyText(raw); toast('Copied', 'check'); }; },
  });
}
async function handleScanText(text, source) {
  if (!text) { toast(`No QR found in ${source}`, 'alert'); haptic('error'); return; }
  scanLocked = false;
  onScanResult(text, { engine: source });
}
function openManual() {
  openSheet(`<h3>Pay a UPI ID</h3><p class="sub">Type any UPI ID, or paste a full upi:// link.</p>
    <div class="form-row"><label>UPI ID</label><div class="field-with-btn"><input class="field" id="mPa" placeholder="name@bank" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="go" inputmode="email"><button class="btn press" id="mPaste" type="button">${icon('paste')} Paste</button></div></div>
    <div class="form-row"><label>Name (optional)</label><input class="field" id="mPn" placeholder="Who are you paying?"></div>
    ${Object.values(store.data.payees).length ? `<div class="form-row"><label>Recent</label><div class="w-chips">${Object.values(store.data.payees).sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 8).map(p => `<button class="chip" data-rp="${esc(p.pa)}">${esc(p.pn || p.pa)}</button>`).join('')}</div></div>` : ''}
    <button class="btn primary full press mt" id="mGo">${icon('chevron')} Continue</button>`, {
    onMount(el, close) {
      const pa = $('#mPa', el);
      setTimeout(() => { try { pa.focus(); } catch (e) {} }, 320);
      $('#mPaste', el).onclick = async () => {
        const t = String(await Scanner.readClipboard() || '').trim();
        const m = t.match(/upi:\/\/[^\s]+/i) || t.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}/);
        if (!m) { toast(t ? 'Copied text has no UPI ID' : 'Nothing copied yet', 'paste', 2000); haptic('error'); return; }
        pa.value = m[0]; haptic('tap'); pa.dispatchEvent(new Event('input'));
      };
      el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#mGo', el).click(); } });
      el.addEventListener('click', e => { const r = e.target.closest('[data-rp]'); if (r) { const p = store.data.payees[r.dataset.rp]; $('#mPa', el).value = p.pa; $('#mPn', el).value = p.pn || ''; } });
      $('#mGo', el).onclick = async () => {
        const v = $('#mPa', el).value.trim();
        let info = UPI.parseQR(v);
        if (!info || info.type !== 'upi') { $('#mPa', el).parentElement.querySelector('input').classList.add('shake'); toast('That doesn’t look like a UPI ID', 'alert'); haptic('error'); return; }
        if ($('#mPn', el).value.trim()) info.pn = $('#mPn', el).value.trim();
        close(); await closeScanner(); openPay(info);
      };
    },
  });
}

/* =========================================================================
   PAY
   ========================================================================= */
function numberWords(n) {
  n = Math.floor(n); if (!n) return '';
  const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const two = x => x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? '-' + a[x % 10] : '');
  const three = x => (x >= 100 ? a[Math.floor(x / 100)] + ' hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : '');
  let out = [];
  if (n >= 10000000) { out.push(three(Math.floor(n / 10000000)) + ' crore'); n %= 10000000; }
  if (n >= 100000) { out.push(two(Math.floor(n / 100000)) + ' lakh'); n %= 100000; }
  if (n >= 1000) { out.push(two(Math.floor(n / 1000)) + ' thousand'); n %= 1000; }
  if (n) out.push(three(n));
  const s = out.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + ' rupees';
}
function guessCat(info, note) {
  const p = store.data.payees[info.pa]; if (p && p.cat && p.cat !== 'other') return p.cat;
  for (const [c, re] of Object.entries(KEYWORDS)) if (re.test(note || '') || re.test(info.pn || '')) return store.data.categories.find(x => x.id === c) ? c : 'other';
  return 'other';
}

function openPay(info, opts = {}) {
  const s = store.s;
  const locked = info.lockedAmount;
  const st = { amount: locked ? String(+info.am) : (opts.amount ? String(opts.amount) : ''), note: info.tn || opts.note || '', cat: guessCat(info, info.tn || opts.note) };
  const name = info.pn || (store.data.payees[info.pa] || {}).pn || info.pa.split('@')[0];
  const kind = info.signed || locked ? '<span class="badge lock">Locked QR</span>' : info.merchant ? '<span class="badge">Merchant</span>' : '<span class="badge">Personal</span>';
  const c0 = store.cat(st.cat);
  const el = document.createElement('div');
  el.className = 'pay';
  el.innerHTML = `
    <div class="pay-top"><button class="icon-btn glass press" data-p="close">${icon('close')}</button><div class="hero-kicker">${locked ? 'Amount set by merchant' : 'Paying'}</div><button class="icon-btn glass press" data-p="fav" aria-label="Favourite">${icon('star')}</button></div>
    <div class="payee glass"><div class="av" id="pAv" style="--c:${c0.color}">${esc(name[0].toUpperCase())}</div><div style="min-width:0"><b>${esc(name)}</b><small>${esc(info.pa)} ${kind}</small></div></div>
    <div class="amount" id="pAmt"><span class="cur">${s.currency}</span><span class="digits" id="pDig"></span><span class="caret"></span></div>
    <div class="amt-expr" id="pExpr"></div><div class="amt-words" id="pWords"></div>
    ${s.recentPayees ? (() => { const seen = new Set([info.pa]); const rec = store.data.tx.filter(t => !seen.has(t.pa) && seen.add(t.pa)).slice(0, 8); return rec.length ? `<div class="chips-row recent-row">${rec.map(t => `<button class="chip recent-chip" data-rpay="${esc(t.pa)}" data-ram="${t.am}" data-rpn="${esc(t.pn || '')}"><i>${esc(((t.pn || t.pa)[0] || '?').toUpperCase())}</i>${esc((t.pn || t.pa).split(' ')[0].slice(0, 12))} · ${money(t.am, { force: true })}</button>`).join('')}</div>` : ''; })() : ''}
    ${s.showQuickAmounts && !locked ? `<div class="chips-row" id="pQuick">${s.quickAmounts.map(a => `<button class="chip" data-qa="${a}">${s.currency}${a}</button>`).join('')}</div>` : ''}
    <label class="note-wrap glass">${icon('edit')}<input id="pNote" placeholder="Add a note (optional)" maxlength="60" value="${esc(st.note)}"></label>
    ${s.showQuickNotes ? `<div class="chips-row">${s.quickNotes.map(n => `<button class="chip" data-qn="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    <div class="cats" id="pCats">${store.data.categories.map(c => `<button class="cat-chip ${c.id === st.cat ? 'on' : ''}" style="--c:${c.color}" data-cat="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>
    ${s.calcKeypad && !locked ? `<div class="calc-row">${['+', '−', '×', '÷', '='].map(o => `<button class="calc-k press" data-op="${o}">${o}</button>`).join('')}</div>` : ''}
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(k => `<button class="key ${locked ? 'dis' : ''}" data-key="${k}">${k === 'del' ? icon('backspace') : k}</button>`).join('')}</div>
    <button class="paybtn" id="pBtn" disabled><div class="hold"></div><span id="pBtnTxt">Enter amount</span></button>`;
  document.body.appendChild(el);
  $('#app').classList.add('dim');
  if (U) U.mode('pay');
  const unstack = pushStack(() => close());
  const favBtn = $('[data-p=fav]', el);
  const refreshFav = () => { const p = store.data.payees[info.pa]; favBtn.style.color = p && p.fav ? 'var(--warn)' : ''; };
  refreshFav();

  let lastLen = 0;
  function paint(animateNew = true) {
    const dig = $('#pDig', el);
    const v = st.amount || '0';
    const disp = v.includes('.') ? (+v.split('.')[0]).toLocaleString('en-IN') + '.' + v.split('.')[1] : (+v).toLocaleString('en-IN');
    const chars = [...disp];
    dig.innerHTML = chars.map((ch, i) => `<span class="${animateNew && i >= chars.length - Math.max(0, chars.length - lastLen) ? 'dg' : ''}">${ch}</span>`).join('');
    if (!st.amount) dig.style.opacity = .35; else dig.style.opacity = 1;
    lastLen = chars.length;
    const n = st.expr ? calc(st.expr + (st.amount || '0')) : (+st.amount || 0);
    $('#pExpr', el).textContent = st.expr ? `${st.expr.replace(/([+−×÷])/g, ' $1 ')}${st.amount || ''} = ${money(n, { force: true })}` : '';
    $('#pWords', el).textContent = n ? numberWords(n) + (st.amount.includes('.') && +st.amount.split('.')[1] ? ' and ' + st.amount.split('.')[1].padEnd(2, '0') + ' paise' : '') : (locked ? '' : 'Type or tap an amount');
    const btn = $('#pBtn', el);
    btn.disabled = !(n > 0);
    const hold = s.breath && n >= s.breathAbove;
    $('#pBtnTxt', el).textContent = n > 0 ? (hold ? `Hold to pay ${money(n, { force: true })}` : `Pay ${money(n, { force: true })}`) : 'Enter amount';
    btn.dataset.hold = hold ? 1 : '';
    $$('[data-qa]', el).forEach(c => c.classList.toggle('on', +c.dataset.qa === n));
    if (U) U.setWarp(Math.min(1, Math.log10(1 + n) / 5));
  }
  paint(false);

  // calculator: "120 + 45" — the expression lives above the amount, Pay uses the result
  const calc = expr => { const tk = expr.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').match(/\d+(\.\d+)?|[-+*/]/g) || []; const out = []; const ops = []; const pr = o => (o === '*' || o === '/') ? 2 : 1;
    const ap = () => { const b = out.pop(), a2 = out.pop(), o = ops.pop(); out.push(o === '+' ? a2 + b : o === '-' ? a2 - b : o === '*' ? a2 * b : b ? a2 / b : 0); };
    tk.forEach(x => { if (/\d/.test(x)) out.push(+x); else { while (ops.length && pr(ops[ops.length - 1]) >= pr(x)) ap(); ops.push(x); } }); while (ops.length && out.length > 1) ap(); return Math.round((out[0] || 0) * 100) / 100; };
  st.expr = '';
  function op(o) {
    if (o === '=') { if (!st.expr) return; const r = calc(st.expr + (st.amount || '0')); st.expr = ''; st.amount = r > 0 ? String(r) : ''; lastLen = 0; haptic('tap'); paint(); return; }
    if (!st.amount && st.expr) { st.expr = st.expr.slice(0, -1) + o; } else if (st.amount) { st.expr += st.amount + o; st.amount = ''; }
    lastLen = 0; haptic('tick'); sfx.key(3); paint();
  }
  function press(k) {
    let a = st.amount;
    if (k === 'del') { a = a.slice(0, -1); sfx.back(); }
    else if (k === '.') { if (a.includes('.')) return bad(); a = (a || '0') + '.'; sfx.key(0); }
    else {
      if (a.includes('.') && a.split('.')[1].length >= 2) return bad();
      if (a === '0') a = '';
      const next = a + k;
      if (+next > 100000) { toast('UPI limit is ₹1,00,000 per payment', 'alert'); return bad(); }
      a = next; sfx.key(+k);
    }
    st.amount = a; haptic('tick'); if (U) U.pulse(0.22); paint();
  }
  function bad() { const am = $('#pAmt', el); am.classList.remove('shake'); void am.offsetWidth; am.classList.add('shake'); haptic('error'); sfx.error(); }

  // long-press backspace clears
  let delTimer = null;
  el.addEventListener('pointerdown', e => { const k = e.target.closest('[data-key=del]'); if (k) delTimer = setTimeout(() => { st.amount = ''; lastLen = 0; paint(false); haptic('heavy'); delTimer = null; }, 550); });
  el.addEventListener('pointerup', () => { if (delTimer) clearTimeout(delTimer); });

  el.addEventListener('click', e => {
    const key = e.target.closest('[data-key]'); if (key && !locked) { if (key.dataset.key === 'del' && delTimer === null && !st.amount) return; press(key.dataset.key); return; }
    const opk = e.target.closest('[data-op]'); if (opk) { op(opk.dataset.op); return; }
    const rp = e.target.closest('[data-rpay]'); if (rp) { haptic('tap'); close(true); setTimeout(() => openPay(UPI.parseQR(`upi://pay?pa=${encodeURIComponent(rp.dataset.rpay)}&pn=${encodeURIComponent(rp.dataset.rpn)}`), { amount: +rp.dataset.ram }), 260); return; }
    const qa = e.target.closest('[data-qa]'); if (qa) { st.amount = qa.dataset.qa; lastLen = 0; haptic('tap'); sfx.key(5); if (U) U.pulse(0.5); paint(); return; }
    const qn = e.target.closest('[data-qn]'); if (qn) { st.note = qn.dataset.qn; $('#pNote', el).value = st.note; const g = guessCat({ pa: '', pn: '' }, st.note); if (g !== 'other') setCat(g); haptic('tick'); return; }
    const ct = e.target.closest('[data-cat]'); if (ct) { setCat(ct.dataset.cat); haptic('tick'); return; }
    const p = e.target.closest('[data-p]');
    if (p && p.dataset.p === 'close') close();
    if (p && p.dataset.p === 'fav') { const pp = store.data.payees[info.pa] || (store.data.payees[info.pa] = { pa: info.pa, pn: name, count: 0, total: 0, cat: st.cat }); pp.fav = !pp.fav; store.save(); refreshFav(); haptic('tap'); toast(pp.fav ? 'Pinned to favourites' : 'Removed from favourites', 'star'); }
  });
  $('#pNote', el).addEventListener('input', e => { st.note = e.target.value; });
  function setCat(id) { st.cat = id; $$('[data-cat]', el).forEach(b => b.classList.toggle('on', b.dataset.cat === id)); $('#pAv', el).style.setProperty('--c', store.cat(id).color); }

  // pay button with breath-hold
  const btn = $('#pBtn', el);
  let holdRaf = null, holdStart = 0;
  btn.addEventListener('pointerdown', e => {
    if (btn.disabled || !btn.dataset.hold) return;
    holdStart = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - holdStart) / 1600);
      btn.style.setProperty('--hold', p);
      if (U) U.pulse(0.03);
      if (Math.floor(p * 10) !== Math.floor((p - 0.016) * 10)) { haptic('tick'); sfx.breath(p); }
      if (p >= 1) { holdRaf = null; btn.style.setProperty('--hold', 0); go_(); return; }
      holdRaf = requestAnimationFrame(step);
    };
    holdRaf = requestAnimationFrame(step);
  });
  const cancelHold = () => { if (holdRaf) { cancelAnimationFrame(holdRaf); holdRaf = null; btn.style.setProperty('--hold', 0); if (performance.now() - holdStart < 1500) toast('Keep holding to confirm', 'hand', 1400); } };
  btn.addEventListener('pointerup', cancelHold); btn.addEventListener('pointerleave', cancelHold);
  btn.addEventListener('click', () => { if (btn.disabled || btn.dataset.hold) return; go_(); });

  let busy = false;
  async function go_() {
    if (busy) return; busy = true;
    try {
      if (st.expr) { const r = calc(st.expr + (st.amount || '0')); st.expr = ''; st.amount = String(r); paint(false); }
      const amt = +st.amount;
      const app = await chooseApp();
      if (!app) return;
      await runPayment({ info, amount: amt, note: st.note, cat: st.cat, app, name, payEl: el, closePay: close });
    } catch (e) {
      console.error('pay failed', e);
      $$('.processing').forEach(p => p.parentNode && p.parentNode.removeChild(p)); if (U) U.setWarp(0);
      toast('Couldn’t open the payment. Tap Pay to try again.', 'alert', 3000); haptic('error');
    } finally { busy = false; }
  }

  let closed = false;
  function close(silent) {
    if (closed) return; closed = true; unstack();
    el.classList.add('closing'); setTimeout(() => el.remove(), 380);
    $('#app').classList.remove('dim');
    if (U) { U.setWarp(0); U.mode(current === 'home' ? 'home' : 'side'); }
    if (!silent) sfx.close();
  }
  return { close };
}

async function chooseApp() {
  const s = store.s;
  const apps = await UPI.installedApps();
  if (!s.askApp && s.defaultApp) {
    const a = apps.find(x => x.id === s.defaultApp) || UPI.APPS.find(x => x.id === s.defaultApp);
    if (a) return a;
  }
  return new Promise(res => {
    let chosen = null;
    const native = !!UPI.upiPlugin();
    const any = UPI.APPS.find(a => a.id === 'chooser');
    let list = native ? apps.filter(a => a.pkg) : UPI.APPS.filter(a => a.id === 'chooser' || a.ios || /android/i.test(navigator.userAgent));
    if (native && any) list = list.concat([any]);
    const def = s.defaultApp && list.find(a => a.id === s.defaultApp);
    if (def) list = [def].concat(list.filter(a => a !== def));
    openSheet(`<h3>Pay with</h3><p class="sub">${native ? (apps.length ? 'UPI apps on this phone' : 'No UPI app found. Pick “Any UPI app”') : 'Choose your UPI app'}</p>
      <div class="app-grid">${list.map(a => `<button class="app-tile press" data-app="${esc(a.id)}"><span class="app-ico" style="--c:${a.color}">${a.icon ? `<img src="data:image/png;base64,${a.icon}" alt="">` : esc(a.glyph)}</span>${esc(a.name)}</button>`).join('')}</div>
      <div class="row glass" data-remember style="border-radius:18px"><div class="lbl"><b>Always use this app</b><small>Change any time in Settings → Payments</small></div><div class="sw"></div></div>`, {
      onMount(el, close) {
        let remember = false;
        $('[data-remember]', el).onclick = () => { remember = !remember; $('[data-remember] .sw', el).classList.toggle('on', remember); sfx.toggle(remember); haptic('tick'); };
        el.addEventListener('click', e => {
          const t = e.target.closest('[data-app]'); if (!t) return;
          chosen = list.find(a => a.id === t.dataset.app);
          if (remember) { store.s.defaultApp = chosen.id; store.s.askApp = false; store.save(); }
          haptic('tap'); close();
        });
      },
      onClose() { setTimeout(() => res(chosen), 120); },
    });
  });
}

async function runPayment({ info, amount, note, cat, app, name, payEl, closePay }) {
  const s = store.s;
  let attempts = UPI.buildAttempts(info, amount, note, app);
  const tx = store.addTx({ pa: info.pa, pn: name, am: amount, note, cat, status: 'pending', app: app.id, raw: info.raw });
  logEvent('pay-start', { title: `Paying ${name}`, sub: `${app.name} · ${info.pa}`, amt: amount, txId: tx.id });
  if (store.s.locLog) getLoc().then(l => { if (l) store.updateTx(tx.id, { loc: l }); });
  store.data.firstRun = false; store.save();

  for (let i = 0; i < attempts.length; i++) {
    const at = attempts[i];
    if (at.copy) { await UPI.copyText(at.copy); toast(`Amount ${money(amount, { force: true })} copied. Type or paste it in ${app.name}`, 'copy', 4200); }
    // ✦ the moment: shatter → portal → warp
    if (i === 0) {
      const b = $('#pBtn', payEl).getBoundingClientRect();
      const t = THEMES[s.theme];
      sfx.shatter(); haptic('heavy');
      if (U) { U.setWarp(1); U.pulse(1); }
      if (s.shatter !== false) shatter({ x: b.left + b.width / 2, y: b.top + b.height / 2, colors: [t.a1, t.a2, t.a3] });
      if (s.portal && !s.reducedMotion) { const p = document.createElement('div'); p.className = 'portal'; p.innerHTML = '<div class="ring"></div>'; document.body.appendChild(p); sfx.whoosh(); setTimeout(() => p.remove(), 1150); }
      await sleep(220);
    }
    const proc = document.createElement('div'); proc.className = 'processing';
    proc.innerHTML = `<div class="spinner"></div><p>Opening ${esc(app.name)}…</p><small>${esc(at.why || 'Complete the payment there, then come back here.')}</small>`;
    document.body.appendChild(proc);
    const res = await UPI.launch(at.uri, app);
    proc.remove();
    if (U) U.setWarp(0);

    // learn per app whether it accepts pre-filled amounts to personal UPI IDs
    if (at.prefill && (res.status === 'failed' || res.status === 'error')) UPI.learnPrefill(app, false);
    if (at.prefill && (res.status === 'paid' || res.status === 'pending')) UPI.learnPrefill(app, true);
    if (res.status === 'paid') return finish(tx, 'paid', res, closePay);
    if (res.status === 'pending' && s.autoConfirm) return finish(tx, 'pending', res, closePay);
    if (res.status === 'manual' || res.status === 'unknown' || (res.status === 'pending' && !s.autoConfirm)) {
      const r = await askOutcome(tx, app, attempts.slice(i + 1));
      if (r === 'retry') continue;
      if (r === 'other') { const a2 = await chooseApp(); if (a2) { app = a2; attempts = UPI.buildAttempts(info, amount, note, app); } i = -1; continue; }
      if (r) return finish(tx, r, {}, closePay);
      return;
    }
    // failed / cancelled / error / noapp → smart retry ladder
    const next = attempts[i + 1];
    const r = await retrySheet(res, app, next);
    if (r === 'retry' && next) continue;
    if (r === 'other') { const a2 = await chooseApp(); if (a2) { app = a2; attempts = UPI.buildAttempts(info, amount, note, app); store.updateTx(tx.id, { app: a2.id }); i = -1; continue; } }
    if (r === 'paid' || r === 'pending') return finish(tx, r, {}, closePay);
    store.updateTx(tx.id, { status: res.status === 'cancelled' ? 'cancelled' : 'failed' });
    toast('Saved as not paid. You can edit it in History.', 'info');
    return;
  }
}

function askOutcome(tx, app, remaining) {
  return new Promise(res => {
    let v = null, off = null;
    openSheet(`<h3>Did it go through?</h3><p class="sub">${esc(app.name)} didn’t report back automatically. Tell Vedverse what happened.</p>
      <button class="opt press" data-o="paid">${icon('check')}<span><b>Yes, paid ${money(tx.am, { force: true })}</b><small>Marks it confirmed and shows your receipt</small></span></button>
      <button class="opt press" data-o="pending">${icon('history')}<span><b>Not sure / pending</b><small>Keeps it in Pending to check later</small></span></button>
      ${remaining.length ? `<button class="opt press" data-o="retry">${icon('refresh')}<span><b>It failed, retry another way</b><small>${esc(remaining[0].label)}: ${esc(remaining[0].why)}</small></span></button>` : ''}
      <button class="opt press" data-o="other">${icon('wallet')}<span><b>Try a different app</b><small>PhonePe, Paytm and others often accept what one app refuses</small></span></button>
      <button class="opt press" data-o="failed">${icon('close')}<span><b>No, not paid</b><small>Saved as failed</small></span></button>`, {
      onMount(el, close) { off = onAutoPaid(tx.id, () => { v = 'paid'; close(); }); el.addEventListener('click', e => { const o = e.target.closest('[data-o]'); if (o) { v = o.dataset.o; close(); } }); },
      onClose() { off && off(); setTimeout(() => res(v), 150); },
    });
  });
}
function retrySheet(res, app, next) {
  return new Promise(r => {
    let v = null;
    const why = res.status === 'noapp' ? `${app.name} didn’t open. It may not be installed.` : res.status === 'cancelled' ? 'Payment was cancelled or the app was closed.' : `${app.name} declined the request${res.error ? ' (' + esc(res.error) + ')' : ''}. This is usually a security rule for payments started from other apps, not a problem with your amount.`;
    haptic('error'); sfx.error();
    openSheet(`<h3>Let’s get this paid</h3><p class="sub">${why}</p>
      ${next ? `<button class="opt press" data-o="retry">${icon('refresh')}<span><b>Retry: ${esc(next.label)}</b><small>${esc(next.why)}</small></span></button>` : ''}
      <button class="opt press" data-o="other">${icon('wallet')}<span><b>Use a different app</b><small>Each app has its own rules, so another one will often work</small></span></button>
      <button class="opt press" data-o="paid">${icon('check')}<span><b>It actually went through</b><small>Mark as paid</small></span></button>
      <button class="opt press" data-o="failed">${icon('close')}<span><b>Give up for now</b><small>Saved as not paid</small></span></button>`, {
      onMount(el, close) { el.addEventListener('click', e => { const o = e.target.closest('[data-o]'); if (o) { v = o.dataset.o; close(); } }); },
      onClose() { setTimeout(() => r(v), 150); },
    });
  });
}

function finish(tx, status, res, closePay) {
  logEvent(status, { title: `${{ paid: 'Paid', pending: 'Pending', failed: 'Failed', cancelled: 'Cancelled' }[status] || status} · ${tx.pn || tx.pa}`, sub: tx.pa, amt: tx.am, txId: tx.id });
  if (status === 'paid' || status === 'pending') { try { markBillPaid(tx.pa); } catch (e) {} }
  store.updateTx(tx.id, { status, ref: res.ref || '', txnId: res.txnId || '' });
  closePay && closePay(true);
  render();
  syncUniverse();
  if (status === 'paid') {
    const t = THEMES[store.s.theme];
    haptic('success'); sfx.success(tx.am, tx.cat);
    if (U) { U.supernova(); }
    confetti([t.a1, t.a2, t.a3, '#ffffff']);
  } else haptic('soft');
  if (store.s.receipt || status !== 'paid') showReceipt(store.data.tx.find(x => x.id === tx.id));
  else toast(`Paid ${money(tx.am, { force: true })} to ${esc(tx.pn)}`, 'check');
  pushWidgets();
}

/* =========================================================================
   RECEIPT
   ========================================================================= */
function showReceipt(tx) {
  if (!tx) return;
  const c = store.cat(tx.cat);
  const app = UPI.APPS.find(a => a.id === tx.app);
  const d = new Date(tx.ts);
  const wrap = document.createElement('div');
  wrap.className = 'receipt-wrap';
  const label = { paid: 'Payment successful', pending: 'Payment pending', failed: 'Payment failed', cancelled: 'Payment cancelled' }[tx.status];
  const ic = tx.status === 'paid' ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : tx.status === 'pending' ? '<path d="M12 7v5l3 2"/>' : '<path d="M7 7l10 10M17 7 7 17"/>';
  wrap.innerHTML = `
    <div class="receipt glass" id="rc">
      <svg class="rc-star" viewBox="0 0 100 100">${Array.from({ length: 14 }, (_, i) => { const x = 10 + (i * 37) % 80, y = 10 + (i * 53) % 80; return `<circle cx="${x}" cy="${y}" r="${i % 4 ? 0.9 : 2}" fill="#fff" opacity=".8"/>`; }).join('')}<path d="M18 30 L40 44 L62 28 L80 60 L52 74" stroke="#fff" stroke-width=".5" fill="none" opacity=".5"/></svg>
      <div class="rc-check ${tx.status === 'paid' ? '' : tx.status === 'pending' ? 'pending' : 'failed'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></div>
      <div class="rc-status ${tx.status === 'paid' ? '' : tx.status === 'pending' ? 'pending' : 'failed'}">${label}</div>
      <div class="rc-amt num" id="rcAmt">${money(0, { force: true })}</div>
      <div class="rc-to">to <b>${esc(tx.pn || tx.pa)}</b></div>
      <div class="perf"></div>
      <div class="rc-rows">
        <div><span>UPI ID</span><b>${esc(tx.pa || '—')}</b></div>
        <div><span>Category</span><b>${c.icon} ${esc(c.name)}</b></div>
        ${tx.note ? `<div><span>Note</span><b>${esc(tx.note)}</b></div>` : ''}
        <div><span>Paid via</span><b>${esc(app ? app.name : tx.app || '—')}</b></div>
        <div><span>Date</span><b>${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</b></div>
        ${tx.ref ? `<div><span>UPI ref</span><b>${esc(tx.ref)}</b></div>` : ''}
        <div><span>Vedverse ID</span><b>${tx.id.toUpperCase()}</b></div>
      </div>
      <div class="chips-row mt" style="margin:14px 0 0;padding:0;justify-content:center">${['paid', 'pending', 'failed'].map(s => `<button class="chip ${tx.status === s ? 'on' : ''}" data-mark="${s}">${s === 'paid' ? '✓ Paid' : s === 'pending' ? '◷ Pending' : '✕ Not paid'}</button>`).join('')}</div>
    </div>
    <div class="rc-actions"><button class="btn press" id="rcStyle">${icon('palette')} Style</button><button class="btn press" id="rcShare">${icon('share')} Share</button><button class="btn primary press" id="rcDone">${icon('check')} Done</button></div>`;
  document.body.appendChild(wrap);
  $('#app').classList.add('dim');
  if (U) U.mode('receipt');
  const unstack = pushStack(() => close());
  // count-up
  const t0 = performance.now(), target = +tx.am;
  const step = (n) => { const k = Math.min(1, (n - t0) / 900); const e = 1 - Math.pow(1 - k, 4); $('#rcAmt', wrap).textContent = money(target * e, { force: true, dec: target % 1 ? 2 : 0 }); if (k < 1) requestAnimationFrame(step); };
  setTimeout(() => requestAnimationFrame(step), 350);
  // holographic sheen follows tilt
  const rc = $('#rc', wrap);
  const holo = (e) => { const g = e.gamma != null ? e.gamma : ((e.clientX || innerWidth / 2) / innerWidth - 0.5) * 60; rc.style.setProperty('--hx', (50 + g * 2.2) + '%'); rc.style.transform = `rotateY(${g * 0.25}deg) rotateX(${e.beta != null ? (e.beta - 45) * -0.12 : 0}deg)`; };
  addEventListener('deviceorientation', holo); addEventListener('pointermove', holo);
  wrap.addEventListener('click', e => {
    const m = e.target.closest('[data-mark]');
    if (m) { store.updateTx(tx.id, { status: m.dataset.mark }); haptic('tap'); close(); showReceipt(store.data.tx.find(x => x.id === tx.id)); render(); syncUniverse(); }
  });
  $('#rcDone', wrap).onclick = () => close();
  $('#rcShare', wrap).onclick = () => { logEvent('receipt', { title: `Shared receipt · ${tx.pn || tx.pa}`, amt: tx.am, txId: tx.id }); shareReceipt(tx); };
  $('#rcStyle', wrap).onclick = () => openReceiptStyles({ openSheet, haptic, onPick: () => { toast('Style saved, tap Share to send', 'check'); } }, tx);
  let closed = false;
  function close() {
    if (closed) return; closed = true; unstack();
    removeEventListener('deviceorientation', holo); removeEventListener('pointermove', holo);
    wrap.style.transition = 'opacity .35s, transform .4s'; wrap.style.opacity = 0; wrap.style.transform = 'scale(.95)';
    setTimeout(() => wrap.remove(), 400);
    $('#app').classList.remove('dim');
    if (U) U.mode(current === 'home' ? 'home' : 'side');
  }
}

async function receiptImage(tx) { return renderReceipt(tx, store.s.receiptStyle); }
async function receiptImageClassic(tx) {
  const W = 1080, H = 1500, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); const t = THEMES[store.s.theme]; const c = store.cat(tx.cat);
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, t.bg1); bg.addColorStop(1, t.bg0); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  [[t.a1, 200, 260], [t.a2, 900, 400], [t.a3, 600, 1300]].forEach(([col, x, y]) => { const r = g.createRadialGradient(x, y, 0, x, y, 600); r.addColorStop(0, col + '88'); r.addColorStop(1, col + '00'); g.fillStyle = r; g.fillRect(0, 0, W, H); });
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2, 0, 7); g.fill(); }
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  rr(90, 220, 900, 1080, 70); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = '800 64px Sora, sans-serif'; g.fillText('Vedverse', W / 2, 150);
  const ok = tx.status === 'paid';
  g.beginPath(); g.arc(W / 2, 380, 90, 0, 7); g.fillStyle = ok ? '#4ee3a0' : tx.status === 'pending' ? '#ffcc66' : '#ff6b81'; g.fill();
  g.strokeStyle = '#06331f'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); if (ok) { g.moveTo(W / 2 - 40, 382); g.lineTo(W / 2 - 8, 414); g.lineTo(W / 2 + 44, 352); } else { g.moveTo(W / 2 - 34, 346); g.lineTo(W / 2 + 34, 414); g.moveTo(W / 2 + 34, 346); g.lineTo(W / 2 - 34, 414); } g.stroke();
  g.fillStyle = '#fff'; g.font = '700 46px Inter, sans-serif'; g.fillText({ paid: 'PAYMENT SUCCESSFUL', pending: 'PAYMENT PENDING' }[tx.status] || 'NOT PAID', W / 2, 540);
  g.font = '800 150px Sora, sans-serif'; g.fillText(money(tx.am, { force: true }), W / 2, 720);
  g.font = '500 44px Inter, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('to ' + (tx.pn || tx.pa), W / 2, 800);
  g.setLineDash([18, 14]); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(150, 870); g.lineTo(930, 870); g.stroke(); g.setLineDash([]);
  const rows = [['UPI ID', tx.pa], ['Category', c.name], ['Note', tx.note], ['Date', new Date(tx.ts).toLocaleString('en-IN')], ['Ref', tx.ref], ['ID', tx.id.toUpperCase()]].filter(r => r[1]);
  rows.forEach(([k, v], i) => { const y = 950 + i * 66; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '500 38px Inter'; g.fillText(k, 160, y); g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '600 38px Inter'; g.fillText(String(v).slice(0, 30), 920, y); });
  g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '500 32px Inter'; g.fillText('your money, alive ✦', W / 2, 1420);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
async function shareReceipt(tx) {
  const blob = await receiptImage(tx);
  const file = new File([blob], `vedverse-${tx.id}.png`, { type: 'image/png' });
  if (UPI.isNative()) {
    try {
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      const FS = window.Capacitor.registerPlugin('Filesystem'), SH = window.Capacitor.registerPlugin('Share');
      const w = await FS.writeFile({ path: file.name, data: b64, directory: 'CACHE' });
      await SH.share({ title: 'Payment receipt', files: [w.uri] });
      return;
    } catch (e) { console.warn(e); }
  }
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Vedverse receipt' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  openSheet(`<h3>Receipt</h3><p class="sub">Long-press the image to save or share it.</p><img src="${url}" style="width:100%;border-radius:20px"><a class="btn primary full press mt" download="${file.name}" href="${url}">${icon('download')} Download</a>`);
}

/* =========================================================================
   TX DETAIL / EDIT
   ========================================================================= */
function openTx(id) {
  const t = store.data.tx.find(x => x.id === id); if (!t) return;
  const p = store.data.payees[t.pa] || {};
  const dt = new Date(t.ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  openSheet(`<h3>${esc(t.pn || t.pa || 'Payment')}</h3><p class="sub">${esc(t.pa || '')}</p>
    <div class="form-row"><label>Status</label><div class="w-chips">${['paid', 'pending', 'failed', 'cancelled'].map(s => `<button class="chip ${t.status === s ? 'on' : ''}" data-st="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div></div>
    <div class="form-row"><label>Amount</label><input class="field num" id="eAm" type="number" inputmode="decimal" value="${t.am}"></div>
    <div class="form-row"><label>Payee name</label><input class="field" id="ePn" value="${esc(t.pn || '')}"></div>
    <div class="form-row"><label>Note</label><input class="field" id="eNote" value="${esc(t.note || '')}"></div>
    <div class="form-row"><label>Category</label><div class="cats" style="margin:0">${store.data.categories.map(c => `<button class="cat-chip ${c.id === t.cat ? 'on' : ''}" style="--c:${c.color}" data-ec="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div></div>
    <div class="form-row"><label>Date & time</label><input class="field" id="eDt" type="datetime-local" value="${dt}"></div>
    <div class="btn-row"><button class="btn press" id="eFav">${icon('star')} ${p.fav ? 'Unpin' : 'Pin payee'}</button><button class="btn press" id="eRc">${icon('spark')} Receipt</button><button class="btn press" id="eAgain">${icon('refresh')} Pay again</button></div>
    <div class="btn-row mt"><button class="btn danger press" id="eDel">${icon('trash')}</button><button class="btn primary press" id="eSave" style="flex:4">${icon('check')} Save changes</button></div>`, {
    tall: true,
    onMount(el, close) {
      let st = t.status, cat = t.cat;
      el.addEventListener('click', e => {
        const s = e.target.closest('[data-st]'); if (s) { st = s.dataset.st; $$('[data-st]', el).forEach(b => b.classList.toggle('on', b === s)); haptic('tick'); }
        const c = e.target.closest('[data-ec]'); if (c) { cat = c.dataset.ec; $$('[data-ec]', el).forEach(b => b.classList.toggle('on', b === c)); haptic('tick'); }
      });
      $('#eSave', el).onclick = () => { store.updateTx(t.id, { status: st, cat, am: +$('#eAm', el).value || 0, pn: $('#ePn', el).value, note: $('#eNote', el).value, ts: new Date($('#eDt', el).value).getTime() || t.ts }); if (t.pa && store.data.payees[t.pa]) store.data.payees[t.pa].cat = cat; store.save(); close(); render(); syncUniverse(); pushWidgets(); toast('Saved', 'check'); haptic('success'); };
      $('#eDel', el).onclick = async () => { close(); if (await confirmSheet('Delete payment?', 'This removes it from history and stats. It does not affect your bank.', 'Delete', true)) { store.deleteTx(t.id); render(); syncUniverse(); toast('Deleted', 'trash'); } };
      $('#eFav', el).onclick = () => { if (!t.pa) return; const pp = store.data.payees[t.pa] || (store.data.payees[t.pa] = { pa: t.pa, pn: t.pn, cat: t.cat, count: 0, total: 0 }); pp.fav = !pp.fav; store.save(); toast(pp.fav ? 'Pinned to favourites' : 'Unpinned', 'star'); close(); render(); };
      $('#eRc', el).onclick = () => { close(); setTimeout(() => showReceipt(t), 200); };
      $('#eAgain', el).onclick = () => { close(); setTimeout(() => openPay(UPI.parseQR(t.raw || t.pa) || { type: 'upi', pa: t.pa, pn: t.pn, params: [], raw: t.pa }, { amount: t.am, note: t.note }), 220); };
    },
  });
}

/* =========================================================================
   PIN LOCK
   ========================================================================= */
function pinPad(title, onDone) {
  const el = $('#lock');
  let v = '';
  el.hidden = false;
  el.innerHTML = `${LOGO(64, 'lk')}<h3>${title}</h3><div class="pin-dots">${'<i></i>'.repeat(4)}</div><div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(k => `<button class="key ${k ? '' : 'dis'}" data-k="${k}">${k === 'del' ? icon('backspace') : k}</button>`).join('')}</div>`;
  el.onclick = e => {
    const k = e.target.closest('[data-k]'); if (!k || !k.dataset.k) return;
    if (k.dataset.k === 'del') v = v.slice(0, -1); else if (v.length < 4) v += k.dataset.k;
    haptic('tick'); sfx.key(+k.dataset.k || 0);
    $$('.pin-dots i', el).forEach((d, i) => d.classList.toggle('on', i < v.length));
    if (v.length === 4) setTimeout(() => { const ok = onDone(v); if (ok === false) { v = ''; $$('.pin-dots i', el).forEach(d => d.classList.remove('on')); $('.pin-dots', el).classList.add('shake'); haptic('error'); sfx.error(); setTimeout(() => $('.pin-dots', el).classList.remove('shake'), 400); } }, 120);
  };
}
function lockApp() { return new Promise(res => { pinPad('Enter PIN', p => { if (p === store.s.pin) { $('#lock').hidden = true; haptic('success'); res(); return true; } return false; }); if (store.s.biometric) biometricUnlock().then(ok => { if (ok) { $('#lock').hidden = true; haptic('success'); res(); } }); }); }
function setPin() {
  pinPad('Choose a 4-digit PIN', p1 => { setTimeout(() => pinPad('Confirm PIN', p2 => { if (p1 === p2) { store.s.pin = p1; store.s.lock = true; store.save(); $('#lock').hidden = true; toast('PIN set, app lock on', 'lock'); renderSettings(); return true; } toast('PINs didn’t match', 'alert'); $('#lock').hidden = true; return true; }), 150); return true; });
}

/* =========================================================================
   DATA FILES
   ========================================================================= */
async function saveBlobFile(blob, name, mime) {
  if (UPI.isNative()) {
    try {
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      const FS = window.Capacitor.registerPlugin('Filesystem'), SH = window.Capacitor.registerPlugin('Share');
      const w = await FS.writeFile({ path: name, data: b64, directory: 'CACHE' });
      await SH.share({ title: name, files: [w.uri] }); return;
    } catch (e) { if (/cancel/i.test(String(e))) return; console.warn(e); }
  }
  const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
}
async function saveFile(name, text, mime) {
  if (UPI.isNative()) {
    try {
      const FS = window.Capacitor.registerPlugin('Filesystem'), SH = window.Capacitor.registerPlugin('Share');
      const w = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await SH.share({ title: name, files: [w.uri] });
      return;
    } catch (e) { console.warn(e); }
  }
  const blob = new Blob([text], { type: mime });
  try { const f = new File([blob], name, { type: mime }); if (navigator.canShare && navigator.canShare({ files: [f] }) && /android|iphone/i.test(navigator.userAgent)) { await navigator.share({ files: [f] }); return; } } catch (e) {}
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast('Exported ' + name, 'download');
}

/* =========================================================================
   Global delegated actions
   ========================================================================= */
async function act(a, el) {
  const [k, v, w] = a.split(':');
  switch (k) {
    case 'scan': return openScanner();
    case 'studio': return studio();
    case 'receive': return openReceive({ openSheet, toast, haptic });
    case 'split': return openSplit({ openSheet, toast, haptic });
    case 'bills': return openBills({ openSheet, toast, haptic, openPay });
    case 'nstudio': return openNotifStudio();
    case 'notif-allow': return notifAllow();
    case 'notif-settings': { const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VedExtras; if (P) P.openNotifSettings(); else toast('Works in the Android app', 'info'); return; }
    case 'notif-test': return notifTest();
    case 'identity': return openIdentity({ openSheet, toast, haptic, logEvent });
    case 'income': return openIncome({ openSheet, toast, haptic, onChange: () => { render(); } });
    case 'statement': return openStatement({ openSheet, toast, haptic, saveBlob: saveBlobFile });
    case 'themebuilder': return openThemeBuilder({ openSheet, toast, haptic, THEMES, preview: th => U && U.setTheme(th), apply: () => { applyAppearance(); renderSettings(); } });
    case 'themeedit': return openThemeBuilder({ openSheet, toast, haptic, THEMES, editId: store.s.theme, preview: th => U && U.setTheme(th), apply: () => { applyAppearance(); renderSettings(); } });
    case 'tod': return openTodEditor({ openSheet, haptic, apply: () => { applyAppearance(); renderSettings(); } });
    case 'dockedit': return openDockEditor({ openSheet, haptic, toast, apply: () => { applyAppearance(); } });
    case 'receiptstyle': { const tx = store.data.tx[0] || { id: 'demo0000000', ts: Date.now(), am: 120, pn: 'Chai Point', pa: 'chai@upi', cat: 'food', status: 'paid', app: 'gpay', note: 'Masala chai' }; return openReceiptStyles({ openSheet, haptic, onPick: () => toast('Receipt style saved', 'check') }, tx); }
    case 'editwidgets': go('home'); setTimeout(() => toggleEdit(true), 300); return;
    case 'timeline': histView = 'timeline'; go('history'); return;
    case 'histfilter': return openHistFilter();
    case 'scanamt': return openScanner({ amount: +v });
    case 'payfav': { const p = store.data.payees[a.slice(7)]; if (p) openPay({ type: 'upi', pa: p.pa, pn: p.pn, params: [], raw: p.pa, merchant: false }); return; }
    case 'tx': return openTx(v);
    case 'go': if (w) histFilter = w; return go(v);
    case 'goal': store.s.goalSaved = (+store.s.goalSaved || 0) + +v; store.save(); haptic('success'); if (U) U.feed(); toast(`+${money(+v, { force: true })} saved toward ${esc(store.s.goalName)}`, 'target'); return renderHome();
    case 'gallery': return openGallery();
    case 'done-edit': return toggleEdit(false);
    case 'reset': if (await confirmSheet('Reset everything?', 'All payments, widgets and settings on this device will be erased.', 'Erase all', true)) { localStorage.clear(); location.reload(); } return;
    case 'export-json': return saveFile(`vedverse-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), 'application/json');
    case 'export-csv': return saveFile(`vedverse-transactions-${new Date().toISOString().slice(0, 10)}.csv`, exportCSV(), 'text/csv');
    case 'import': return $('#importInput').click();
    case 'pick-default': {
      const prevAsk = store.s.askApp; store.s.askApp = true;
      const app = await chooseApp();
      if (app) { store.s.defaultApp = app.id; store.s.askApp = false; } else store.s.askApp = prevAsk;
      store.save(); return renderSettings();
    }
    case 'set-pin': return setPin();
    case 'addcat': {
      const name = $('#newCatName').value.trim(); if (!name) return;
      const hues = ['#ff9f43', '#5f9bff', '#ffd166', '#ff5fa2', '#7cf0c5', '#b38cff', '#ff6b6b', '#4ee3a0'];
      store.data.categories.splice(store.data.categories.length - 1, 0, { id: 'c' + store.newId(), name, icon: $('#newCatIcon').value.trim() || '🎯', color: hues[store.data.categories.length % hues.length] });
      store.save(); haptic('success'); return renderSettings();
    }
  }
}

function bindGlobal() {
  // dock
  $$('.dock-item').forEach(b => b.onclick = () => { if (b.dataset.go) go(b.dataset.go); else if (b.dataset.dact) act(b.dataset.dact); });
  $('#dockScan').innerHTML = `<span class="scan-orb">${icon('scan')}</span>`;
  applyDock();
  $('#dockScan').onclick = () => openScanner();
  $('#privacyBtn').onclick = () => { store.s.hideAmounts = !store.s.hideAmounts; store.save(); applyAppearance(); render(); haptic('tap'); toast(store.s.hideAmounts ? 'Amounts hidden' : 'Amounts visible', store.s.hideAmounts ? 'eyeOff' : 'eye', 1400); };
  $('#editBtn').innerHTML = icon('grid');
  $('#editBtn').onclick = () => toggleEdit();
  $('#brand').onclick = () => { if (U) { U.supernova(); } haptic('success'); sfx.success(100, 'fun'); };

  // scanner controls
  $('#scanClose').innerHTML = icon('close'); $('#scanTorch i').outerHTML = icon('flash');
  $('#scanGallery i').outerHTML = icon('image'); $('#scanPaste i').outerHTML = icon('paste'); $('#scanManual i').outerHTML = icon('keypad');
  $('#scanClose').onclick = () => closeScanner();
  $('#scanTorch').onclick = async () => {
    const m = TORCH_NEXT[store.s.scanTorch || 'auto']; store.s.scanTorch = m; store.save();
    paintTorch(m, m === 'on');
    const on = scanCtl ? await scanCtl.setTorchMode(m) : false; paintTorch(m, on); haptic('tap');
  };
  if ($('#scanZooms')) $('#scanZooms').onclick = e => {
    const b = e.target.closest('[data-z]'); if (!b || !scanCtl) return; haptic('tick');
    if (b.dataset.z === 'auto') { scanAutoZoom = true; scanCtl.setAutoZoom(true); scanCtl.zoom(1); paintZoom(1); }
    else manualZoom(+b.dataset.z);
  };
  $('#scanGallery').onclick = () => $('#galleryInput').click();
  $('#galleryInput').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    $('#scanBadge').textContent = 'Reading image…';
    const text = await Scanner.decodeImage(f);
    $('#scanBadge').textContent = scanCtl ? scanCtl.engine + ' · live' : 'Gallery';
    handleScanText(text, 'gallery');
  };
  $('#scanPaste').onclick = async () => {
    haptic('tap');
    const t = String(await Scanner.readClipboard() || '').trim();
    let info = t && UPI.parseQR(t);
    if (!info || info.type !== 'upi') { const m = t.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}/); if (m) info = UPI.parseQR('upi://pay?pa=' + encodeURIComponent(m[0])); }
    if (!info || info.type !== 'upi') { toast(t ? 'Copied text has no UPI ID' : 'Nothing copied. Copy a UPI ID first', 'paste', 2200); return; }
    await closeScanner(); openPay(info, { amount: scanOpts.amount });
  };
  $('#scanManual').onclick = () => openManual();
  // pinch to zoom (any manual zoom hands control back from auto-zoom)
  const pts = new Map(); let pinch0 = 0, z0 = 1;
  $('#scanner').addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = zoomNow; } });
  $('#scanner').addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2 && scanCtl && pinch0 > 0) { const [a, b] = [...pts.values()]; manualZoom(z0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch0); } });
  ['pointerup', 'pointercancel'].forEach(ev => $('#scanner').addEventListener(ev, e => pts.delete(e.pointerId)));
  // tap = focus there, double-tap = toggle 2×
  let lastTap = 0;
  $('#scanner').addEventListener('click', e => {
    if (e.target.closest('button,input') || !scanCtl || scanLocked) return;
    const n = Date.now();
    if (n - lastTap < 300) { manualZoom(zoomNow > 1.5 ? 1 : 2); haptic('tick'); lastTap = 0; return; }
    lastTap = n;
    scanCtl.focus(e.clientX / innerWidth, e.clientY / innerHeight);
    const f = $('#scanFocus'); f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px';
    f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  });
  // warm the camera as soon as a finger touches any scan button — it's already starting when the tap lands
  let warmT = 0;
  const warmScan = () => {
    window.__vv_scanEngine = store.s.scanEngine; Scanner.prepare();
    clearTimeout(warmT); warmT = setTimeout(() => { if ($('#scanner').hidden) Scanner.cancelPrepare(); }, 3000);
  };
  document.addEventListener('pointerdown', e => { if (e.target.closest('#dockScan,[data-act^="scan"]')) warmScan(); }, { passive: true, capture: true });

  // delegated clicks
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (a && !e.target.closest('.pay')) { if (editing && a.closest('.widget') && !a.closest('.section-h')) return; act(a.dataset.act, a); return; }
    const wx = e.target.closest('[data-wx]'); if (wx) { store.data.widgets = store.data.widgets.filter(w => w.id !== wx.dataset.wx); store.save(); haptic('tap'); renderHome(); return; }
    const we = e.target.closest('[data-we]'); if (we) { openBuilder(we.dataset.we); return; }
    const tx = e.target.closest('[data-tx]'); if (tx) { openTx(tx.dataset.tx); return; }
    const hf = e.target.closest('[data-hf]'); if (hf) { histFilter = hf.dataset.hf; haptic('tick'); renderHistory(); return; }
    const sk = e.target.closest('[data-sky]'); if (sk) { histView = sk.dataset.sky === '2' ? 'timeline' : 'list'; skyMode = sk.dataset.sky === '1'; haptic('tap'); if (U) U.mode(skyMode ? 'sky' : 'side'); renderHistory(); if (skyMode && !U) toast('Turn on the 3D universe in Settings to see your sky', 'cube'); return; }
    const sp = e.target.closest('[data-sp]'); if (sp) { statPeriod = sp.dataset.sp; haptic('tick'); renderStats(); return; }
    const th = e.target.closest('[data-theme]'); if (th) { store.s.theme = th.dataset.theme; store.save(); applyAppearance(); renderSettings(); haptic('success'); if (U) U.supernova(); return; }
    const sc = e.target.closest('[data-setcat]'); if (sc) { setPage = sc.dataset.setcat; haptic('tap'); renderSettings(); $('#s-settings').scrollTop = 0; return; }
    if (e.target.closest('[data-setback]')) { setPage = null; haptic('tap'); renderSettings(); return; }
    const fc = e.target.closest('[data-font]'); if (fc) { store.s.fontFamily = fc.dataset.font; store.save(); applyAppearance(); haptic('tick'); renderSettings(); return; }
    const lg = e.target.closest('[data-lang]'); if (lg) { store.s.lang = lg.dataset.lang; store.save(); applyAppearance(); haptic('tick'); render(); return; }
    const cc = e.target.closest('[data-color-clear]'); if (cc) { store.s[cc.dataset.colorClear] = ''; store.save(); applyAppearance(); renderSettings(); return; }
    const wz = e.target.closest('[data-wsz]'); if (wz) { const w = store.data.widgets.find(x => x.id === wz.dataset.wsz); if (w) { const order = ['s', 'w', 't']; w.size = order[(order.indexOf(w.size || CATALOG[w.type].size || 's') + 1) % 3]; store.save(); haptic('tick'); renderHome(); } return; }
    const tg = e.target.closest('[data-tg]'); if (tg) {
      const k = tg.dataset.tg; const v = !store.s[k];
      if (k === 'lock' && v && !store.s.pin) { setPin(); return; }
      store.s[k] = v; store.save(); $('.sw', tg).classList.toggle('on', v); sfx.toggle(v); haptic('tick'); applyAppearance();
      if (NOTIF_KEYS.has(k)) onNotifSetting(k, v);
      if (['locLog', 'biometric'].includes(k)) onToggle(k, v, { toast }).then(ok => { if (!ok && v) { store.s[k] = false; store.save(); $('.sw', tg).classList.remove('on'); } });
      if (k === 'timeOfDay' || k === 'greetings') render();
      if (k === 'three') { toast('Restarting universe…', 'cube'); setTimeout(() => location.reload(), 600); }
      if (k === 'hideAmounts') render();
      return;
    }
    const sg = e.target.closest('[data-segk] button'); if (sg) {
      const seg = sg.closest('[data-segk]'); const k = seg.dataset.segk; let v = sg.dataset.sv; if (seg.dataset.num) v = +v;
      store.s[k] = v; store.save(); $$('button', seg).forEach(b => b.classList.toggle('on', b === sg)); segKnob(seg); haptic('tick'); sfx.tick(); applyAppearance();
      if (NOTIF_KEYS.has(k)) onNotifSetting(k, v);
      if (k === 'payMode' && $('#sub-payMode')) $('#sub-payMode').textContent = PAYMODE_DESC[v];
      if (seg.dataset.reload) { toast('Applying…', 'cube'); setTimeout(() => location.reload(), 500); }
      return;
    }
    const dc = e.target.closest('[data-delcat]'); if (dc) { if (store.data.categories.length <= 2 || dc.dataset.delcat === 'other') { toast('Keep at least “Other”', 'info'); return; } store.data.categories = store.data.categories.filter(c => c.id !== dc.dataset.delcat); store.save(); renderSettings(); return; }
    const pm = e.target.closest('#playMonth'); if (pm) { playMonthViz(); return; }
    const hero = e.target.closest('#hero'); if (hero && U && !editing) { U.feed(); haptic('soft'); sfx.success(20, 'fun'); const s = stats(); toast(s.health > .7 ? 'The horizon is calm. Keep this pace' : s.health > .4 ? 'The disk is heating up, watch the pace' : 'The disk is flaring, time to slow down', 'spark'); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'histSearch') { histQuery = t.value; clearTimeout(t._d); t._d = setTimeout(renderHistory, 160); return; }
    if (t.id === 'setSearch') { setQuery = t.value; clearTimeout(t._d); t._d = setTimeout(renderSettings, 140); return; }
    if (t.dataset && t.dataset.color) { store.s[t.dataset.color] = t.value; store.save(); applyAppearance(); return; }
    if (t.dataset.sl) { const k = t.dataset.sl; store.s[k] = +t.value; t.style.setProperty('--p', ((t.value - t.min) / (t.max - t.min) * 100) + '%'); $('#val-' + k).textContent = t.value + t.dataset.unit; if (!t.dataset.reload) applyAppearance(); store.save(); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sl && t.dataset.reload) { toast('Applying…', 'cube'); setTimeout(() => location.reload(), 400); }
    if ((t.dataset.sl && NOTIF_KEYS.has(t.dataset.sl)) || (t.dataset.color && NOTIF_KEYS.has(t.dataset.color))) onNotifSetting(t.dataset.sl || t.dataset.color, store.s[t.dataset.sl || t.dataset.color]);
    if (t.dataset.in) { store.s[t.dataset.in] = t.dataset.num ? (+t.value || 0) : t.value; store.save(); haptic('tick'); toast('Saved', 'check', 1000); syncUniverse(); }
    if (t.dataset.list) { const arr = t.value.split(',').map(x => x.trim()).filter(Boolean); store.s[t.dataset.list] = t.dataset.num ? arr.map(Number).filter(n => n > 0) : arr; store.save(); toast('Saved', 'check', 1000); }
    if (t.id === 'importInput' && t.files[0]) {
      const f = t.files[0]; t.value = '';
      f.text().then(async txt => {
        const replace = await confirmSheet('Import data', 'Merge with your current history, or replace everything with this file?', 'Replace all', true);
        try { const n = importData(txt, replace ? 'replace' : 'merge'); toast(`Imported ${n} transactions`, 'upload'); applyAppearance(); render(); syncUniverse(); }
        catch (err) { toast('Couldn’t read that file', 'alert'); }
      });
    }
  });

  // light-follow + widget tilt + press burst
  // light follows the finger: measured in the element's own (unscaled) box, and on tap too, not only on drag
  const lightAt = e => {
    const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
    const r = g.getBoundingClientRect(); if (!r.width) return;
    const sx = g.offsetWidth / r.width || 1, sy = g.offsetHeight / r.height || 1;
    g.style.setProperty('--mx', ((e.clientX - r.left) * sx) + 'px'); g.style.setProperty('--my', ((e.clientY - r.top) * sy) + 'px');
  };
  document.addEventListener('pointerdown', lightAt, { passive: true, capture: true });
  addEventListener('resize', () => { try { moveBlob(); } catch (e) {} }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { moveBlob(); } catch (e) {} });
  document.addEventListener('pointermove', e => {
    lightAt(e);
    const w = e.target.closest && e.target.closest('.widget');
    if (w && !editing && e.pointerType !== 'touch') { const r = w.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; w.style.setProperty('--ry', (x * 10) + 'deg'); w.style.setProperty('--rx', (-y * 10) + 'deg'); w.style.setProperty('--sx', (100 - (x + .5) * 100) + '%'); }
  }, { passive: true });
  document.addEventListener('pointerout', e => { const w = e.target.closest && e.target.closest('.widget'); if (w && !w.contains(e.relatedTarget)) { w.style.setProperty('--rx', '0deg'); w.style.setProperty('--ry', '0deg'); w.style.setProperty('--sx', '120%'); } });
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('.key,.paybtn,.widget,.opt,.scan-act,.btn,.gallery-item,.app-tile .app-ico,.tx');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const kx = t.offsetWidth / r.width || 1, ky = t.offsetHeight / r.height || 1;
    const b = document.createElement('span'); b.className = 'lit-burst'; b.style.left = ((e.clientX - r.left) * kx) + 'px'; b.style.top = ((e.clientY - r.top) * ky) + 'px';
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    if (getComputedStyle(t).overflow !== 'hidden') t.style.overflow = 'hidden';
    t.appendChild(b); setTimeout(() => b.remove(), 650);
    if (!t.classList.contains('key')) { haptic('tick'); }
  }, { passive: true });

  // touch tilt (gyro-driven) for widgets on phones
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || current !== 'home' || editing) return;
    const ry = Math.max(-6, Math.min(6, e.gamma / 6)), rx = Math.max(-6, Math.min(6, -(e.beta - 45) / 8));
    root.style.setProperty('--gyx', rx + 'deg'); root.style.setProperty('--gyy', ry + 'deg');
    $$('#wgrid .widget').forEach(w => { w.style.setProperty('--rx', rx + 'deg'); w.style.setProperty('--ry', ry + 'deg'); w.style.setProperty('--sx', (60 - ry * 8) + '%'); });
  }, { passive: true });

  // sky drag to spin
  let sx = null;
  document.addEventListener('pointerdown', e => { if (skyMode && current === 'history' && !e.target.closest('button,input,.glass')) sx = e.clientX; });
  document.addEventListener('pointermove', e => { if (sx !== null && U) { U.spinSky((e.clientX - sx) * 0.08); sx = e.clientX; } });
  document.addEventListener('pointerup', () => { sx = null; });
  // tap constellation star → payee
  $('#labels').addEventListener('click', e => { const l = e.target.closest('.star-l'); if (!l) return; const p = store.data.payees[l.dataset.k]; if (!p) return; haptic('tap'); openSheet(`<h3>${esc(p.pn || p.pa)}</h3><p class="sub">${esc(p.pa)}</p><div class="stat-grid"><div class="stat-card glass"><small>Total paid</small><b class="num">${money(p.total)}</b></div><div class="stat-card glass"><small>Payments</small><b class="num">${p.count}</b></div></div><button class="btn primary full press mt2" data-act="payfav:${esc(p.pa)}">${icon('bolt')} Pay again</button>`); });

  addEventListener('resize', () => { moveBlob(); $$('.seg').forEach(segKnob); });
  store.on(() => { syncUniverse(); pushWidgetsDebounced(); });
}

function playMonthViz() {
  const list = paid({ range: 'month' });
  if (!list.length) { toast('No payments this month to play yet', 'music'); return; }
  const bars = $$('#viz i');
  const dur = playMonth(list, (t) => {
    if (U) U.pulse(0.35);
    bars.forEach((b, i) => { b.style.height = (8 + Math.random() * 92 * Math.min(1, Math.log10(+t.am + 1) / 3)) + '%'; });
    haptic('tick');
  });
  setTimeout(() => bars.forEach(b => b.style.height = '8%'), dur + 600);
}

/* =========================================================================
   Native bridges: back button, deep links, status bar, home widgets
   ========================================================================= */
function handleUrl(url) {
  if (!url) return;
  if (/^vedverse:\/\/home/i.test(url)) { go('home'); return; }
  if (/^vedverse:\/\/history/i.test(url)) { go('history'); return; }
  if (/^vedverse:\/\/stats/i.test(url)) { go('stats'); return; }
  if (/^vedverse:\/\/settings/i.test(url)) { go('settings'); return; }
  if (/^vedverse:\/\/studio/i.test(url)) { go('settings'); setTimeout(studio, 120); return; }
  if (/^vedverse:\/\/manual/i.test(url)) { openManual(); return; }
  if (/^vedverse:\/\/receive/i.test(url)) { act('receive'); return; }
  if (/^vedverse:\/\/bills/i.test(url)) { act('bills'); return; }
  if (/^vedverse:\/\/split/i.test(url)) { act('split'); return; }
  if (/^vedverse:\/\/(nstudio|reminders)/i.test(url)) { go('settings'); setTimeout(openNotifStudio, 120); return; }
  if (/^vedverse:\/\/pay\?/i.test(url)) {
    const q = new URLSearchParams(url.split('?')[1] || '');
    const p = UPI.parseQR(`upi://pay?pa=${encodeURIComponent(q.get('pa') || '')}&pn=${encodeURIComponent(q.get('pn') || '')}${q.get('am') ? '&am=' + q.get('am') : ''}&cu=INR`);
    if (p && p.type === 'upi') openPay(p);
    return;
  }
  if (/^vedverse:\/\/(gallery|paste)/i.test(url)) { const g = /gallery/i.test(url); if ($('#scanner').hidden) openScanner(); setTimeout(() => (g ? $('#scanGallery') : $('#scanPaste')).click(), 400); return; }
  if (/^vedverse:\/\/scan(\b|$)/i.test(url) || /[?&]scan=1/.test(url)) { if ($('#scanner').hidden) setTimeout(() => openScanner(), 50); return; }
  const m = url.match(/^vedverse:\/\/scanamt\/(\d+)/i); if (m) { openScanner({ amount: +m[1] }); return; }
  const p = UPI.parseQR(url);
  if (p && p.type === 'upi') openPay(p);
}
function handleBack() {
  if (current === 'settings' && (setPage || setQuery) && !stack.length) { setPage = null; setQuery = ''; renderSettings(); return; }
  if (!$('#lock').hidden) return;
  const top = stack[stack.length - 1];
  if (top) { top.close(); return; }
  if (editing) { toggleEdit(false); return; }
  if (current !== 'home') { go('home'); return; }
  try { window.Capacitor.registerPlugin('App').minimizeApp(); } catch (e) {}
}
let wTimer = null;
function pushWidgetsDebounced() { clearTimeout(wTimer); wTimer = setTimeout(pushWidgets, 600); }
async function pushWidgets() {
  if (!UPI.upiPlugin()) return;
  try { await UPI.pushWidgetData(await hwPayload(THEMES[store.s.theme] || THEMES.nebula)); } catch (e) { console.warn('widgets', e); }
}
function studio() {
  openStudio({ openSheet, toast, haptic, theme: () => THEMES[store.s.theme] || THEMES.nebula, onSave: pushWidgets });
}
async function nativeSetup() {
  if (!UPI.isNative()) return;
  if (UPI.platform() === 'android') root.classList.add('native-android');
  try { const SB = window.Capacitor.registerPlugin('StatusBar'); await SB.setOverlaysWebView({ overlay: true }); await SB.setStyle({ style: THEMES[store.s.theme].light ? 'LIGHT' : 'DARK' }); } catch (e) {}
  try {
    const App = window.Capacitor.registerPlugin('App');
    App.addListener('backButton', handleBack);
    App.addListener('appUrlOpen', e => handleUrl(e.url));
    App.addListener('resume', () => { render(); syncUniverse(); if (window.__vvAuto) window.__vvAuto.pull(); notifResume(); });
    const l = await App.getLaunchUrl(); if (l && l.url) handleUrl(l.url);
  } catch (e) {}
  try { const S = window.Capacitor.registerPlugin('SplashScreen'); S.hide({ fadeOutDuration: 300 }); } catch (e) {}
}

/* =========================================================================
   BOOT
   ========================================================================= */
async function boot() {
  store.load();
  applyAppearance();
  bindGlobal();
  bindWidgetDrag();
  document.addEventListener('scroll', () => { scrolling = true; fpsPolicy(); clearTimeout(scrollT); scrollT = setTimeout(() => { scrolling = false; fpsPolicy(); }, 220); }, { passive: true, capture: true });
  go('home');
  performance.mark('vv-home');
  window.__vvPayOutside = () => !!store.s.payOutside;
  window.__vv = { store, get U() { return U; }, openPay, openScanner, go, showReceipt, UPI };
  // native setup runs alongside; the 3D universe starts right after the first frame paints
  const native = nativeSetup().catch(e => console.warn('native', e));
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  performance.mark('vv-painted');
  await initUniverse();
  performance.mark('vv-3d');
  applyAppearance();
  syncUniverse();
  await Promise.race([native, sleep(1500)]);   // a slow native call never delays the lock screen or widgets
  performance.mark('vv-native');
  const s = store.s;
  if (s.intro && !s.reducedMotion && store.data.firstRun && !s.introSeen && !/[?&]nointro/.test(location.search)) {
    s.introSeen = true; store.save();
    const intro = $('#intro');
    $('#introLogo').innerHTML = LOGO(110, 'in');
    intro.hidden = false;
    if (!U) intro.classList.add('solid');
    $('#app').classList.add('dim');
    if (U) await U.intro(3000); else await sleep(2600);
    intro.classList.add('out');
    $('#app').classList.remove('dim');
    if (U) U.mode('home');
    setTimeout(() => { intro.hidden = true; intro.classList.remove('out'); }, 800);
  }
  if (s.lock && s.pin) await lockApp();
  initAutoConfirm({ toast, onChange: () => { render(); syncUniverse(); } }).then(a => { window.__vvAuto = a; });
  initNotify({ openSheet, toast, haptic, onChange: () => { render(); syncUniverse(); } });
  setInterval(() => { if (store.s.timeOfDay && U) U.setTheme(todTheme(THEMES[store.s.theme] || THEMES.nebula)); }, 10 * 60000);
  if (/[?&]scan=1/.test(location.search) || s.scanOnLaunch) openScanner();
  pushWidgets();
}
boot();

// Vedverse — home-screen widgets + Widget Studio.
// The app owns every widget design as a JSON spec. It resolves them (built-in design ← your Studio edits),
// expands action sources (favourites, amounts, apps…) and pushes everything to the native engine
// (native/android/java/VedWidgets.java), which paints them on the home screen with orbiting rings,
// a pulsing core, twinkling stars and sliding cards. Studio previews here use the same geometry and ring art.
import { store, stats, daily, money, timeAgo } from './store.js';
import * as UPI from './upi.js';
import { icon } from './icons.js';

// mirrors native/android/widgets.json (launcher entries)
export const HW = [
  ['budget', 'Orbit budget', 4, 2], ['today', 'Today', 4, 1], ['safe', 'Safe to spend', 2, 2], ['last', 'Last payment', 4, 1],
  ['scan', 'Scan portal', 2, 2], ['favs', 'Favourites', 4, 2], ['horizon', 'Event horizon', 2, 2], ['deck', 'Command deck', 4, 2],
  ['strip', 'Scan strip', 4, 1], ['amounts', 'Quick amounts', 4, 2], ['apps', 'Pay apps', 4, 1], ['pulse', 'Pulse cards', 4, 2],
  ['clock', 'Galaxy clock', 2, 2], ['week', 'Week', 4, 2], ['cats', 'Categories', 4, 2], ['goal', 'Savings goal', 4, 2],
  ['pending', 'To confirm', 4, 1], ['minimal', 'Minimal', 4, 1], ['single', 'Singularity', 4, 4], ['recent', 'Recent payees', 4, 1],
  ['ring', 'Month ring', 2, 2], ['meter', 'Daily meter', 4, 2],
  ['custom1', 'Studio 1', 4, 2], ['custom2', 'Studio 2', 2, 2], ['custom3', 'Studio 3', 4, 1], ['custom4', 'Studio 4', 4, 2],
].map(([key, name, cw, ch]) => ({ key, name, cw, ch }));
const META = Object.fromEntries(HW.map(h => [h.key, h]));

export const TOKENS = ['today', 'month', 'budget', 'remaining', 'allowance', 'pct', 'leftPct', 'pending', 'pendingText', 'daysLeft', 'last', 'lastName', 'lastAgo', 'goalName', 'goalSaved', 'goalAmount', 'goalPct', 'week', 'date', 'name', 'healthText', 'todayLeft', 'count'];
export const BARS = ['', 'pct', 'leftPct', 'goalPct', 'todayPct'];
export const LAYOUTS = ['orb', 'center', 'grid', 'flip', 'chart', 'minimal'];
export const BGS = ['void', 'glass', 'nebula', 'aurora', 'solid'];
export const ORBS = ['hole', 'glow', 'none'];
export const SOURCES = ['custom', 'favs', 'recent', 'amounts', 'apps', 'deck'];
export const GLYPHS = ['scan', 'history', 'stats', 'bolt', 'keypad', 'home', 'gear', 'star', 'plus', 'paste', 'image', 'studio', 'orbit', 'text', 'user', 'app'];
const TAPS = { 'vedverse://home': 'Home', 'vedverse://scan': 'Scanner', 'vedverse://history': 'History', 'vedverse://stats': 'Insights', 'vedverse://studio': 'Widget Studio', 'vedverse://manual': 'Pay UPI ID' };

/* ------------------------------------------------------------------ built-in designs */
export function builtin(key) {
  const B = { bg: 'void', orb: 'hole', rings: 'on', stars: 'on', radius: 26, tap: 'vedverse://home' };
  const D = {
    budget: { layout: 'orb', title: 'This month', big: '{month} / {budget}', sub: '{remaining} left · {pct}% used', bar: 'pct' },
    today: { layout: 'orb', title: 'Today', big: '{today}', sub: '{pendingText}' },
    safe: { layout: 'center', title: 'Safe to spend', center: '{allowance}', big: '{allowance} a day', sub: '{daysLeft} days left' },
    last: { layout: 'orb', title: 'Last payment', big: '{last}', sub: '{lastName} · {lastAgo}', tap: 'vedverse://history' },
    scan: { layout: 'center', bg: 'nebula', title: 'Scan & pay', center: 'SCAN', big: 'Tap to scan', sub: 'Locks in milliseconds', tap: 'vedverse://scan' },
    favs: { layout: 'grid', bg: 'glass', title: 'Favourites', source: 'favs' },
    horizon: { layout: 'center', title: 'Event horizon', center: '{leftPct}%', big: '{remaining} left', sub: '{healthText}' },
    deck: { layout: 'grid', title: 'Command deck', source: 'deck' },
    strip: { layout: 'grid', title: 'Scan with amount', source: 'amounts', stars: 'off' },
    amounts: { layout: 'grid', bg: 'glass', title: 'Scan with amount', source: 'amounts' },
    apps: { layout: 'grid', title: 'Pay apps', source: 'apps' },
    pulse: { layout: 'flip', bg: 'nebula', pages: [{ title: 'Today', big: '{today}', sub: '{pendingText}' }, { title: 'This month', big: '{month}', sub: '{remaining} left of {budget}', bar: 'pct' }, { title: 'Safe to spend', big: '{allowance} / day', sub: '{daysLeft} days left' }] },
    clock: { layout: 'center', orb: 'glow', clock: true, title: '{date}', sub: '{today} today' },
    week: { layout: 'chart', chart: 'week', title: 'Last 7 days', big: '{week}', tap: 'vedverse://stats' },
    cats: { layout: 'chart', chart: 'cats', bg: 'glass', title: 'This month', big: '{month}', tap: 'vedverse://stats' },
    goal: { layout: 'orb', bg: 'aurora', title: '{goalName}', big: '{goalSaved} / {goalAmount}', sub: '{goalPct}% saved', bar: 'goalPct', orb: 'glow' },
    pending: { layout: 'orb', title: 'To confirm', big: '{pending}', sub: 'payments waiting', tap: 'vedverse://history' },
    minimal: { layout: 'minimal', stars: 'off', rings: 'off', title: 'Left this month', big: '{remaining}', sub: '{allowance} a day is safe' },
    single: { layout: 'center', bg: 'nebula', title: 'Vedverse', center: '{leftPct}%', big: '{remaining} left', sub: '{month} spent of {budget}', bar: 'pct' },
    recent: { layout: 'grid', title: 'Recent', source: 'recent' },
    ring: { layout: 'center', bg: 'glass', title: 'Month', center: '{pct}%', big: '{month}', sub: 'of {budget}', bar: 'pct' },
    meter: { layout: 'orb', title: 'Today vs allowance', big: '{today} / {allowance}', sub: '{todayLeft} left today', bar: 'todayPct' },
    custom1: { layout: 'orb', bg: 'nebula', title: 'My widget', big: '{remaining}', sub: 'Edit me in Widget Studio' },
    custom2: { layout: 'center', title: 'My widget', center: '{leftPct}%', big: '{remaining}', sub: 'Edit me in Widget Studio' },
    custom3: { layout: 'grid', title: 'My shortcuts', source: 'deck' },
    custom4: { layout: 'flip', bg: 'aurora', pages: [{ title: 'Today', big: '{today}', sub: '{date}' }, { title: 'Month', big: '{month}', sub: '{pct}% of budget', bar: 'pct' }, { title: 'Goal', big: '{goalPct}%', sub: '{goalName}', bar: 'goalPct' }] },
  };
  return { name: (META[key] || {}).name || key, ...B, ...(D[key] || D.custom1) };
}

function hw() { if (!store.data.hw) store.data.hw = { over: {} }; return store.data.hw; }
export function resolved(key) { return { ...builtin(key), ...(hw().over[key] || {}) }; }

/* ------------------------------------------------------------------ action sources */
let appsCache = null;
async function upiApps() {
  if (appsCache) return appsCache;
  try { appsCache = (await UPI.installedApps()) || []; } catch (e) { appsCache = []; }
  return appsCache;
}
function expandActions(spec, apps) {
  const payee = p => ({ label: p.pn || p.pa, icon: 'user', url: `upi://pay?pa=${encodeURIComponent(p.pa)}&pn=${encodeURIComponent(p.pn || '')}` });
  switch (spec.source) {
    case 'favs': return Object.values(store.data.payees).filter(p => p.fav).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 8).map(payee)
      .concat(Object.values(store.data.payees).filter(p => !p.fav).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 8).map(payee)).slice(0, 8);
    case 'recent': return Object.values(store.data.payees).sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 8).map(payee);
    case 'amounts': return [{ label: 'Scan', icon: 'scan', url: 'vedverse://scan' }].concat((store.s.quickAmounts || []).slice(0, 7).map(a => ({ label: store.s.currency + a, sub: 'scan & pay', icon: 'text', url: `vedverse://scanamt/${a}` })));
    case 'apps': return (apps.length ? apps : UPI.APPS || []).slice(0, 8).map(a => ({ label: a.name, icon: 'app', app: a.pkg, url: 'vedverse://scan' }));
    case 'deck': return [
      { label: 'Scan', icon: 'scan', url: 'vedverse://scan' }, { label: 'UPI ID', icon: 'keypad', url: 'vedverse://manual' },
      { label: 'History', icon: 'history', url: 'vedverse://history' }, { label: 'Insights', icon: 'stats', url: 'vedverse://stats' },
      { label: 'Gallery', icon: 'image', url: 'vedverse://gallery' }, { label: 'Paste', icon: 'paste', url: 'vedverse://paste' },
      { label: 'Studio', icon: 'studio', url: 'vedverse://studio' }, { label: 'Settings', icon: 'gear', url: 'vedverse://settings' }];
    default: return (spec.actions || []).slice(0, 8);
  }
}

/* ------------------------------------------------------------------ data feed */
export function dataFeed(theme) {
  const s = stats(), S = store.s;
  const pct = Math.round(s.ratio * 100), leftPct = Math.max(0, 100 - pct);
  const t = store.data.tx.find(x => x.status === 'paid');
  const goalPct = S.goalAmount > 0 ? Math.min(100, Math.round((+S.goalSaved || 0) / S.goalAmount * 100)) : 0;
  const allow = Math.floor(s.allowance), todayPct = allow > 0 ? Math.min(100, Math.round(s.today / allow * 100)) : (s.today > 0 ? 100 : 0);
  const days = 'SMTWTFS';
  const cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => { const c = store.cat(k); return { l: c.name, v, t: money(v), c: c.color }; });
  return {
    v: 2,
    f: {
      today: money(s.today), month: money(s.month), budget: money(S.monthlyBudget), remaining: money(s.remaining), allowance: money(allow),
      pct: String(pct), leftPct: String(leftPct), pending: String(s.pending), pendingText: s.pending ? `${s.pending} to confirm` : 'all clear ✓',
      daysLeft: String(s.daysLeft), last: t ? money(t.am) : '—', lastName: t ? (t.pn || t.pa) : 'No payments yet', lastAgo: t ? timeAgo(t.ts) : '',
      goalName: S.goalName || 'Goal', goalSaved: money(+S.goalSaved || 0), goalAmount: money(S.goalAmount || 0), goalPct: String(goalPct),
      week: money(s.week), date: new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), name: S.name || '',
      healthText: s.health > .7 ? 'calm · on pace' : s.health > .4 ? 'heating up' : 'flaring · slow down', todayLeft: money(Math.max(0, allow - s.today)), count: String(s.monthCount),
    },
    n: { pct, leftPct, goalPct, todayPct, health: +s.health.toFixed(3) },
    week: daily(7).map(d => ({ l: days[new Date(d.ts).getDay()], v: d.v })),
    cats,
    theme: { a1: theme.a1, a2: theme.a2, bg0: theme.bg0, bg1: theme.bg1, hot: theme.hot },
  };
}
export async function payload(theme) {
  const d = dataFeed(theme), apps = await upiApps();
  d.specs = {};
  HW.forEach(h => { const sp = { ...resolved(h.key) }; if (store.s.widgetsFollowTheme && !sp.fixed) { delete sp.a1; delete sp.a2; delete sp.text; } d.specs[h.key] = { ...sp, actions: expandActions(sp, apps) }; });
  return d;
}

/* ------------------------------------------------------------------ live HTML preview (same geometry as native) */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fill = (t, f) => esc(String(t || '').replace(/\{(\w+)\}/g, (_, k) => f[k] != null ? f[k] : ''));
const RING_A = `<svg viewBox="0 0 100 100" class="hw-ra"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M50,4 A46,46 0 0,1 89.84,73" stroke-width="1.7" opacity=".9"/><path d="M65.73,93.23 A46,46 0 0,1 14.76,79.57" stroke-width="1.2" opacity=".55"/><path d="M6.77,34.27 A46,46 0 0,1 34.27,6.77" stroke-width=".9" opacity=".35"/></g><circle cx="89.84" cy="73" r="3" fill="#fff"/><circle cx="6.77" cy="65.73" r="1.6" fill="#fff" opacity=".8"/></svg>`;
const RING_B = `<svg viewBox="0 0 100 100" class="hw-rb"><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M96,50 A46,46 0 0,1 57.99,95.3" stroke-width="1.3" opacity=".7"/><path d="M27,89.84 A46,46 0 0,1 4.7,42.01" stroke-width="1" opacity=".4"/><path d="M20.43,14.76 A46,46 0 0,1 89.84,27" stroke-width="1.1" opacity=".6"/></g><circle cx="89.84" cy="27" r="2.2" fill="#fff"/></svg>`;
const GLYPH_ICON = { scan: 'scan', history: 'history', stats: 'stats', bolt: 'bolt', keypad: 'keypad', home: 'home', gear: 'settings', star: 'star', plus: 'plus', paste: 'paste', image: 'image', studio: 'grid', orbit: 'spark' };

export function dims(key) { const m = META[key] || { cw: 4, ch: 2 }; return { w: 78 * m.cw - 14, h: 78 * m.ch - 14 }; }

export function preview(key, spec, feed, scale = 1) {
  const { w, h } = dims(key), f = feed.f, n = feed.n;
  const a1 = spec.a1 || feed.theme.a1, a2 = spec.a2 || feed.theme.a2, txt = spec.text || '#ffffff';
  const health = n.health;
  const vars = `--a1:${a1};--a2:${a2};--tx:${txt};--hot:${feed.theme.hot};--b0:${feed.theme.bg0};--b1:${feed.theme.bg1};--rad:${spec.radius || 26}px;--w:${w}px;--h:${h}px;--disk:${health < .4 ? '#ff6a3a' : a1}`;
  const rings = spec.rings !== 'off', stars = spec.stars !== 'off';
  const orb = (cx, cy, R, kind) => {
    const box = `left:${cx - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px`;
    const body = kind === 'none' ? '' : kind === 'glow' ? '<i class="hw-glow"></i><i class="hw-core"></i>' : '<i class="hw-glow"></i><i class="hw-disk"></i><i class="hw-arc"></i><i class="hw-hole"></i><i class="hw-disk front"></i>';
    return `<div class="hw-orb" style="${box}">${body}${kind !== 'none' ? '<i class="hw-pulse"></i>' : ''}${rings ? RING_A + `<div class="hw-rbw">${RING_B}</div>` : ''}</div>`;
  };
  const bar = (k) => { const v = n[k]; return k && v != null ? `<div class="hw-bar"><i style="width:${Math.max(3, v)}%"></i></div>` : ''; };
  const badge = (x, y, s) => rings ? `<div class="hw-orb badge" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px">${RING_A}<div class="hw-rbw">${RING_B}</div></div>` : '';
  let L = spec.layout || 'orb', inner = '';
  if (L === 'orb') {
    const slim = h < 96, box = slim ? 52 : 92, m = slim ? 8 : 10;
    inner = orb(m + box / 2, h / 2, box / 2, spec.orb || 'hole') + `<div class="hw-txt ${slim ? 'slim' : ''}" style="left:${m + box + (slim ? 8 : 10)}px"><b class="t">${fill(spec.title, f)}</b><b class="big">${fill(spec.big, f)}</b>${slim ? '' : bar(spec.bar)}<span class="sub">${fill(spec.sub, f)}</span></div>`;
  } else if (L === 'center') {
    const box = Math.min(w, h) < 132 ? 88 : 128, R = box / 2, cy = h / 2, room = h - (cy + R);
    inner = orb(w / 2, cy, R, spec.orb || 'hole') + `<b class="hw-ct" style="top:${Math.max(6, cy - R - 16)}px">${fill(spec.title, f)}</b>` +
      (spec.clock ? `<b class="hw-clock" style="top:${cy}px">${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[ap]m/i, '')}</b>` : `<b class="hw-center" style="top:${cy}px;font-size:${R > 50 ? 15 : 12}px">${fill(spec.center, f)}</b>`) +
      (room > 46 ? `<div class="hw-below" style="top:${cy + R + 6}px"><b class="big">${fill(spec.big, f)}</b>${room > 62 ? bar(spec.bar) : ''}<span class="sub">${fill(spec.sub, f)}</span></div>` : `<span class="hw-bsub">${fill(spec.sub, f)}</span>`);
  } else if (L === 'grid') {
    const two = h >= 100, acts = (spec.actions || []).slice(0, two ? 8 : 4);
    const cell = a => {
      if (!a) return '<div class="hw-cell empty"></div>';
      const g = a.icon || 'text', lab = fill(a.label, f);
      const art = g === 'text' ? `<b class="txt">${lab}</b>` : g === 'user' ? `<i class="ini">${esc((a.label || '?')[0].toUpperCase())}</i>` : g === 'app' ? `<i class="ini app">${esc((a.label || '?')[0])}</i>` : icon(GLYPH_ICON[g] || 'spark');
      return `<div class="hw-cell">${art}${two && g !== 'text' ? `<small>${lab}</small>` : ''}</div>`;
    };
    inner = `${two ? `<b class="hw-gt">${fill(spec.title, f)}</b>` + badge(w - 8 - 4 - 22, 8 + 4, 22) : ''}<div class="hw-grid ${two ? 'two' : ''}">${Array.from({ length: two ? 8 : 4 }, (_, i) => cell(acts[i])).join('')}</div>`;
  } else if (L === 'flip') {
    const pages = (spec.pages && spec.pages.length ? spec.pages : [spec]).slice(0, 3);
    inner = `<div class="hw-flip">${[0, 1, 2].map(i => { const p = pages[i % pages.length]; return `<div class="pg"><b class="t">${fill(p.title, f)}</b><b class="big">${fill(p.big, f)}</b>${bar(p.bar)}<span class="sub">${fill(p.sub, f)}</span><span class="dots">${[0, 1, 2].map(k => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span></div>`; }).join('')}</div>` + badge(w - 36, 10, 26);
  } else if (L === 'chart') {
    let ch = '';
    if (spec.chart === 'cats') ch = `<div class="hw-cats">${feed.cats.map(c => `<div><span>${esc(c.l)}</span><i style="width:${Math.max(4, c.v / (feed.cats[0] ? feed.cats[0].v : 1) * 100)}%;background:${c.c}"></i><em>${esc(c.t)}</em></div>`).join('') || '<small>No spends yet</small>'}</div>`;
    else { const mx = Math.max(1, ...feed.week.map(x => x.v)); ch = `<div class="hw-week">${feed.week.map((x, i) => `<div><i style="height:${Math.max(4, x.v / mx * 100)}%" class="${i === feed.week.length - 1 ? 'now' : ''}"></i><small>${x.l}</small></div>`).join('')}</div>`; }
    inner = `<div class="hw-chart"><b class="t">${fill(spec.title, f)}</b><b class="big">${fill(spec.big, f)}</b>${ch}</div>` + badge(w - 36, 10, 26);
  } else {
    inner = `<div class="hw-min"><b class="t">${fill(spec.title, f)}</b><b class="big">${fill(spec.big, f)}</b><span class="sub">${fill(spec.sub, f)}</span></div>` + badge(w - 36, 10, 26);
  }
  const photo = spec.bgImg ? `;background:linear-gradient(rgba(0,0,0,${spec.bgDim == null ? .35 : spec.bgDim}),rgba(0,0,0,${spec.bgDim == null ? .35 : spec.bgDim})),url(${spec.bgImg}) center/cover` : '';
  return `<div class="hwp-wrap" style="width:${w * scale}px;height:${h * scale}px"><div class="hwp bg-${spec.bg || 'void'} ${stars ? 'stars' : ''}" style="${vars};transform:scale(${scale})${photo}">${stars ? '<i class="hw-tw"></i>' : ''}${inner}</div></div>`;
}

/* ------------------------------------------------------------------ Widget Studio */
export function openStudio(ctx) {
  const { openSheet, toast, haptic, theme, onSave } = ctx;
  let placed = {}, view = 'list', key = null, tab = 'design', draft = null, focusInput = null;
  const P = UPI.upiPlugin();
  const refreshPlaced = async () => { if (P && P.widgetInfo) { try { placed = (await P.widgetInfo()).placed || {}; } catch (e) {} } };

  openSheet('<div class="studio" id="studio"></div>', {
    tall: true,
    async onMount(el, close) {
      const root = el.querySelector('#studio');
      await refreshPlaced();
      const feed = () => { const d = dataFeed(theme()); return d; };
      let apps = await upiApps();
      const withActs = sp => ({ ...sp, actions: expandActions(sp, apps) });

      const list = () => {
        const fd = feed();
        root.innerHTML = `<div class="studio-head"><div><h3>Widget Studio</h3><p class="sub">Design what lives on your home screen. Edits sync to your widgets instantly.</p></div></div>
          <div class="studio-tip">${icon('info')}<span>Long-press your home screen → Widgets → <b>Vedverse</b>, or tap a design and use <b>Add to home screen</b>.</span></div>
          <div class="studio-grid">${HW.map(h => { const sp = withActs(resolved(h.key)); const d = dims(h.key); const sc = Math.min(1, (h.cw === 4 ? 300 : 142) / d.w) * (h.cw === 4 ? 1 : 1);
            return `<button class="studio-card press ${h.cw === 4 ? 'wide' : ''}" data-k="${h.key}">${preview(h.key, sp, fd, h.cw === 4 ? 0.98 : 0.98)}<div class="sc-meta"><b>${esc(sp.name)}</b><small>${h.cw}×${h.ch}${hw().over[h.key] ? ' · edited' : ''}${placed[h.key] ? ` · <em>on home ×${placed[h.key]}</em>` : ''}</small></div></button>`; }).join('')}</div>`;
        root.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { key = b.dataset.k; draft = JSON.parse(JSON.stringify(resolved(key))); tab = 'design'; view = 'edit'; haptic('tap'); render(); });
      };

      const chips = (name, opts, cur, labels) => `<div class="chips">${opts.map(o => `<button class="chip ${String(cur) === String(o) ? 'on' : ''}" data-set="${name}" data-v="${esc(o)}">${esc(labels ? labels[o] || o : (o || 'none'))}</button>`).join('')}</div>`;
      const field = (k, label, ph = '') => `<div class="form-row"><label>${label}</label><input class="field" data-in="${k}" value="${esc(draft[k] || '')}" placeholder="${esc(ph)}" autocomplete="off"></div>`;

      const edit = () => {
        const fd = feed(), m = META[key];
        const prev = preview(key, withActs(draft), fd, Math.min(1.15, 330 / dims(key).w));
        let body = '';
        if (tab === 'design') body = `
          <div class="form-row"><label>Name</label><input class="field" data-in="name" value="${esc(draft.name)}"></div>
          <div class="form-row"><label>Layout</label>${chips('layout', LAYOUTS, draft.layout)}</div>
          <div class="form-row"><label>Background</label>${chips('bg', BGS, draft.bg)}</div>
          ${['orb', 'center'].includes(draft.layout) ? `<div class="form-row"><label>Core</label>${chips('orb', ORBS, draft.orb, { hole: 'Black hole', glow: 'Glow', none: 'None' })}</div>` : ''}
          <div class="form-row"><label>Motion</label>${chips('rings', ['on', 'off'], draft.rings || 'on', { on: 'Orbit rings', off: 'No rings' })}${chips('stars', ['on', 'off'], draft.stars || 'on', { on: 'Twinkling stars', off: 'No stars' })}</div>
          <div class="form-row"><label>Colours</label><div class="studio-colors">
            <label>Accent<input type="color" data-col="a1" value="${draft.a1 || theme().a1}"></label>
            <label>Glow<input type="color" data-col="a2" value="${draft.a2 || theme().a2}"></label>
            <label>Text<input type="color" data-col="text" value="${draft.text || '#ffffff'}"></label>
            <button class="chip" data-reset-col="1">Use theme</button></div></div>
          <div class="form-row"><label>Background photo</label><div class="btn-row"><button class="btn press" id="stPhoto">${icon('image')} ${draft.bgImg ? 'Change photo' : 'Use my photo'}</button>${draft.bgImg ? `<button class="btn press" id="stPhotoX">${icon('close')} Remove</button>` : ''}</div><input type="file" accept="image/*" id="stPhotoIn" hidden>${draft.bgImg ? `<label style="margin-top:10px">Darken photo · ${Math.round((draft.bgDim == null ? .35 : draft.bgDim) * 100)}%</label><input type="range" min="0" max="0.8" step="0.05" value="${draft.bgDim == null ? .35 : draft.bgDim}" data-range="bgDim">` : ''}</div>
          <div class="form-row"><label>Corner radius · ${draft.radius || 26}px</label><input type="range" min="6" max="40" value="${draft.radius || 26}" data-range="radius"></div>`;
        if (tab === 'content') body = `
          <div class="studio-tokens"><small>Tap to insert live data:</small>${TOKENS.map(t => `<button class="chip tiny" data-tok="${t}">{${t}}</button>`).join('')}</div>
          ${draft.layout === 'flip' ? (draft.pages || []).concat([{}, {}, {}]).slice(0, 3).map((p, i) => `<div class="studio-page"><b>Card ${i + 1}</b>
              <input class="field" data-page="${i}.title" value="${esc(p.title || '')}" placeholder="Title">
              <input class="field" data-page="${i}.big" value="${esc(p.big || '')}" placeholder="Big text">
              <input class="field" data-page="${i}.sub" value="${esc(p.sub || '')}" placeholder="Small text">
              <select class="field" data-page="${i}.bar">${BARS.map(b => `<option value="${b}" ${p.bar === b ? 'selected' : ''}>${b ? 'Bar: ' + b : 'No bar'}</option>`).join('')}</select></div>`).join('') :
            field('title', 'Title', '{date}') + (draft.layout !== 'grid' ? field('big', 'Big text', '{remaining}') + field('sub', 'Small text', '{allowance} a day') : '') + (draft.layout === 'center' ? field('center', 'Inside the orb', '{leftPct}%') : '')}
          ${['orb', 'center', 'minimal'].includes(draft.layout) ? `<div class="form-row"><label>Progress bar</label>${chips('bar', BARS, draft.bar || '')}</div>` : ''}
          ${draft.layout === 'center' ? `<div class="form-row"><label>Live clock</label>${chips('clock', ['true', 'false'], String(!!draft.clock), { true: 'Clock on', false: 'Off' })}</div>` : ''}
          ${draft.layout === 'chart' ? `<div class="form-row"><label>Chart</label>${chips('chart', ['week', 'cats'], draft.chart || 'week', { week: 'Last 7 days', cats: 'Categories' })}</div>` : ''}
          <div class="form-row"><label>Tap opens</label>${chips('tap', Object.keys(TAPS), draft.tap || 'vedverse://home', TAPS)}</div>`;
        if (tab === 'actions') body = draft.layout !== 'grid' ? `<p class="sub">Actions show on the <b>grid</b> layout. Switch the layout in Design to use them.</p>` : `
          <div class="form-row"><label>Buttons come from</label>${chips('source', SOURCES, draft.source || 'custom', { custom: 'My list', favs: 'Favourites', recent: 'Recent payees', amounts: 'Quick amounts', apps: 'UPI apps', deck: 'App shortcuts' })}</div>
          ${(draft.source || 'custom') === 'custom' ? `<div class="studio-acts">${(draft.actions || []).map((a, i) => `<div class="studio-act">
              <input class="field" data-act-i="${i}.label" value="${esc(a.label || '')}" placeholder="Label">
              <select class="field" data-act-i="${i}.icon">${GLYPHS.map(g => `<option ${a.icon === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
              <input class="field" data-act-i="${i}.${a.icon === 'app' ? 'app' : 'url'}" value="${esc(a.icon === 'app' ? a.app || '' : a.url || '')}" placeholder="${a.icon === 'app' ? 'com.phonepe.app' : 'vedverse://scan · upi://pay?pa=…'}">
              <button class="icon-btn press" data-act-del="${i}">${icon('close')}</button></div>`).join('')}</div>
            ${(draft.actions || []).length < 8 ? `<div class="chips">${[['Scan', 'scan', 'vedverse://scan'], ['₹100', 'text', 'vedverse://scanamt/100'], ['History', 'history', 'vedverse://history'], ['Insights', 'stats', 'vedverse://stats'], ['UPI ID', 'keypad', 'vedverse://manual'], ['Studio', 'studio', 'vedverse://studio']].map(([l, g, u]) => `<button class="chip" data-act-add="${esc(JSON.stringify({ label: l, icon: g, url: u }))}">+ ${l}</button>`).join('')}${apps.slice(0, 4).map(a => `<button class="chip" data-act-add="${esc(JSON.stringify({ label: a.name, icon: 'app', app: a.pkg }))}">+ ${esc(a.name)}</button>`).join('')}</div>` : ''}` :
            `<p class="sub">Buttons fill in automatically from your ${draft.source === 'apps' ? 'installed UPI apps' : draft.source}. Pick <b>My list</b> to choose them yourself.</p>`}`;
        if (tab === 'code') body = `<p class="sub">The full design as JSON. Edit anything, then Apply. Tokens like <code>{remaining}</code> become live data on your home screen.</p>
          <textarea class="field studio-code" id="stCode" spellcheck="false">${esc(JSON.stringify(draft, null, 2))}</textarea>
          <div class="btn-row mt"><button class="btn primary press" id="stApply">${icon('check')} Apply code</button><button class="btn press" id="stCopy">${icon('copy')} Copy</button></div><small class="muted tiny" id="stErr"></small>`;

        root.innerHTML = `<div class="studio-top"><button class="icon-btn glass press" id="stBack">${icon('chevron')}</button><div><b>${esc(draft.name)}</b><small>${m.cw}×${m.ch} · ${placed[key] ? `on home ×${placed[key]}` : 'not on home screen'}</small></div></div>
          <div class="studio-stage">${prev}</div>
          <div class="seg studio-tabs">${['design', 'content', 'actions', 'code'].map(t => `<button class="${tab === t ? 'on' : ''}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
          <div class="studio-body">${body}</div>
          <div class="studio-foot">
            <button class="btn primary press" id="stSave">${icon('check')} Save & sync</button>
            <button class="btn press" id="stPin">${icon('plus')} Add to home screen</button>
            <div class="btn-row"><button class="btn press" id="stDup">${icon('copy')} Copy to a Studio slot</button><button class="btn press" id="stReset">${icon('refresh')} Reset</button></div>
          </div>`;
        bind();
      };

      const render = () => { if (view === 'list') list(); else edit(); };
      const repaint = () => { const st = root.querySelector('.studio-stage'); if (st) st.innerHTML = preview(key, withActs(draft), feed(), Math.min(1.15, 330 / dims(key).w)); };
      const setPath = (obj, path, v) => { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { if (o[k] == null) o[k] = /^\d+$/.test(k) ? {} : {}; o = o[k]; }); o[ks[ks.length - 1]] = v; };

      const bind = () => {
        root.querySelector('#stBack').onclick = () => { view = 'list'; render(); };
        root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; haptic('tick'); render(); });
        root.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
          let v = b.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false;
          draft[b.dataset.set] = v;
          if (b.dataset.set === 'layout' && v === 'flip' && !draft.pages) draft.pages = [{ title: draft.title || 'Today', big: draft.big || '{today}', sub: draft.sub || '' }, { title: 'Month', big: '{month}', sub: '{pct}% of budget', bar: 'pct' }, { title: 'Safe', big: '{allowance}', sub: 'a day' }];
          if (b.dataset.set === 'layout' && v === 'grid' && !draft.source && !draft.actions) draft.source = 'deck';
          haptic('tick'); render();
        });
        root.querySelectorAll('[data-in]').forEach(i => { i.onfocus = () => focusInput = i; i.oninput = () => { draft[i.dataset.in] = i.value; repaint(); }; });
        root.querySelectorAll('[data-page]').forEach(i => { i.onfocus = () => focusInput = i; i.oninput = i.onchange = () => { draft.pages = (draft.pages || []).concat([{}, {}, {}]).slice(0, 3); setPath(draft.pages, i.dataset.page, i.value); repaint(); }; });
        root.querySelectorAll('[data-col]').forEach(i => i.oninput = () => { draft[i.dataset.col] = i.value; draft.fixed = true; repaint(); });
        const ph = root.querySelector('#stPhoto'); if (ph) { const fi = root.querySelector('#stPhotoIn'); ph.onclick = () => fi.click(); fi.onchange = async () => { const f = fi.files[0]; if (!f) return; const bmp = await createImageBitmap(f); const sc = Math.min(1, 640 / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); draft.bgImg = cv.toDataURL('image/jpeg', 0.72); haptic('success'); render(); }; }
        const phx = root.querySelector('#stPhotoX'); if (phx) phx.onclick = () => { delete draft.bgImg; delete draft.bgDim; render(); };
        const rc = root.querySelector('[data-reset-col]'); if (rc) rc.onclick = () => { delete draft.a1; delete draft.a2; delete draft.text; draft.fixed = false; render(); };
        root.querySelectorAll('[data-range]').forEach(i => i.oninput = () => { draft[i.dataset.range] = +i.value; i.previousElementSibling.textContent = i.dataset.range === 'bgDim' ? `Darken photo · ${Math.round(i.value * 100)}%` : `Corner radius · ${i.value}px`; repaint(); });
        root.querySelectorAll('[data-tok]').forEach(b => b.onclick = () => {
          const i = focusInput && root.contains(focusInput) ? focusInput : root.querySelector('[data-in="big"],[data-page]');
          if (!i) return; const p = i.selectionStart != null ? i.selectionStart : i.value.length;
          i.value = i.value.slice(0, p) + `{${b.dataset.tok}}` + i.value.slice(p); i.dispatchEvent(new Event('input')); i.focus(); haptic('tick');
        });
        root.querySelectorAll('[data-act-i]').forEach(i => i.oninput = i.onchange = () => { draft.actions = draft.actions || []; setPath(draft.actions, i.dataset.actI, i.value); if (i.tagName === 'SELECT') render(); else repaint(); });
        root.querySelectorAll('[data-act-del]').forEach(b => b.onclick = () => { draft.actions.splice(+b.dataset.actDel, 1); render(); });
        root.querySelectorAll('[data-act-add]').forEach(b => b.onclick = () => { draft.actions = draft.actions || []; draft.actions.push(JSON.parse(b.dataset.actAdd)); draft.source = 'custom'; haptic('tap'); render(); });
        const ap = root.querySelector('#stApply');
        if (ap) ap.onclick = () => {
          try { const j = JSON.parse(root.querySelector('#stCode').value); if (typeof j !== 'object' || Array.isArray(j)) throw new Error('Design must be a JSON object'); draft = j; haptic('success'); toast('Code applied', 'check'); render(); }
          catch (e) { root.querySelector('#stErr').textContent = '⚠ ' + e.message; haptic('error'); }
        };
        const cp = root.querySelector('#stCopy'); if (cp) cp.onclick = () => { UPI.copyText(root.querySelector('#stCode').value); toast('Copied', 'check'); };
        root.querySelector('#stSave').onclick = async () => { hw().over[key] = draft; store.save(); await onSave(); haptic('success'); toast(placed[key] ? 'Saved · your home-screen widget updated' : 'Saved', 'check'); };
        root.querySelector('#stReset').onclick = async () => { delete hw().over[key]; store.save(); draft = JSON.parse(JSON.stringify(resolved(key))); await onSave(); toast('Back to the original design', 'refresh'); render(); };
        root.querySelector('#stPin').onclick = async () => {
          hw().over[key] = draft; store.save(); await onSave();
          if (!P || !P.pinWidget) { toast('Add widgets from the Android app', 'info'); return; }
          try { const r = await P.pinWidget({ key }); if (!r.ok) toast('Long-press your home screen → Widgets → Vedverse', 'info', 3200); else toast('Confirm on the next screen to place it', 'check'); }
          catch (e) { toast('Long-press your home screen → Widgets → Vedverse', 'info', 3200); }
          setTimeout(async () => { await refreshPlaced(); }, 4000);
        };
        root.querySelector('#stDup').onclick = () => {
          const pick = document.createElement('div'); pick.className = 'studio-pick glass';
          pick.innerHTML = `<b>Copy this design into…</b>${['custom1', 'custom2', 'custom3', 'custom4'].map(k => `<button class="btn press" data-slot="${k}">${META[k].name} · ${META[k].cw}×${META[k].ch}${placed[k] ? ' · on home' : ''}</button>`).join('')}`;
          root.appendChild(pick);
          pick.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => { hw().over[b.dataset.slot] = { ...draft, name: draft.name + ' copy' }; store.save(); await onSave(); pick.remove(); toast(`Copied to ${META[b.dataset.slot].name}`, 'check'); key = b.dataset.slot; draft = JSON.parse(JSON.stringify(resolved(key))); render(); });
          setTimeout(() => document.addEventListener('click', function off(e) { if (!pick.contains(e.target)) { pick.remove(); document.removeEventListener('click', off); } }), 0);
        };
      };
      render();
    },
  });
}

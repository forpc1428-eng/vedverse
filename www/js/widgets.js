import { dueList } from './tools.js';
import { monthIncome } from './extras.js';
// Vedverse — Widget engine: 28 built-ins + unlimited custom widgets
import { store, stats, paid, sum, daily, streak, money, compact, timeAgo, rangeStart, DAY, startOfDay } from './store.js';
import { icon } from './icons.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ring(p, size = 64, stroke = 7, color = 'var(--a2)', track = 'rgba(255,255,255,.08)', id = 'r') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p));
  const gid = 'rg' + id + Math.random().toString(36).slice(2, 6);
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="${color === 'var(--a2)' ? 'var(--a1)' : color}"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${track}" stroke-width="${stroke}" fill="none"/>
    <circle class="ring-v" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#${gid})" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" style="--c:${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}
export function bars(vals, h = 54, labels) {
  const max = Math.max(1, ...vals);
  return `<div class="bars" style="height:${h}px">${vals.map((v, i) => `<div class="bar-col"><div class="bar" style="--h:${Math.max(3, (v / max) * 100)}%;--i:${i}"></div>${labels ? `<span>${labels[i]}</span>` : ''}</div>`).join('')}</div>`;
}
export function spark(vals, w = 160, h = 44) {
  const max = Math.max(1, ...vals), n = vals.length;
  const pts = vals.map((v, i) => [i / (n - 1 || 1) * w, h - 4 - (v / max) * (h - 8)]);
  let d = ''; pts.forEach((p, i) => { if (!i) d = `M${p[0]} ${p[1]}`; else { const q = pts[i - 1]; const mx = (q[0] + p[0]) / 2; d += ` C${mx} ${q[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`; } });
  const gid = 'sp' + Math.random().toString(36).slice(2, 7);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a2)" stop-opacity=".45"/><stop offset="1" stop-color="var(--a2)" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${gid})"/><path class="spark-line" d="${d}" fill="none" stroke="var(--a2)" stroke-width="2" stroke-linecap="round"/></svg>`;
}
export function donut(parts, size = 92, stroke = 12) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r; let off = 0;
  const segs = parts.map((p, i) => { const len = p.v / total * c; const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})" style="--i:${i}" class="donut-seg"/>`; off += len; return s; }).join('');
  return `<svg class="donut" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="${stroke}"/>${segs}</svg>`;
}
function heat() {
  const days = daily(35); const max = Math.max(1, ...days.map(d => d.v));
  return `<div class="heat">${days.map(d => `<i style="--v:${(d.v / max).toFixed(2)}" title="${new Date(d.ts).toDateString()}"></i>`).join('')}</div>`;
}
const head = (ic, t) => `<div class="w-head">${icon(ic)}<span>${esc(t)}</span></div>`;
const big = (v, sub = '') => `<div class="w-big num" data-count="1">${v}</div>${sub ? `<div class="w-sub">${sub}</div>` : ''}`;

function topBy(key) {
  const m = {}; paid({ range: 'month' }).forEach(t => { const k = key(t); if (k) m[k] = (m[k] || 0) + (+t.am || 0); });
  return Object.entries(m).sort((a, b) => b[1] - a[1])[0];
}

export const CATALOG = {
  creature: { name: 'Horizon', size: 'w', ic: 'spark', desc: 'Your black hole and how calm it is', render() { const s = stats(); const mood = s.health > .8 ? ['Calm', 'Steady disk, spending on pace'] : s.health > .55 ? ['Stable', 'Doing fine. Keep this pace'] : s.health > .3 ? ['Heating up', 'Spending faster than the month'] : ['Flaring', 'Budget almost gone. Go gentle']; return `<div class="w-creature"><div class="w-orb" style="--h:${s.health}"></div><div><div class="w-kicker">The horizon is</div><div class="w-title">${mood[0]}</div><div class="w-sub">${mood[1]}</div></div></div>`; } },
  budgetRing: { name: 'Budget ring', size: 's', ic: 'target', desc: 'Month budget used', render() { const s = stats(); return `${head('target', 'Budget')}<div class="w-ring">${ring(s.ratio, 74, 8)}<div class="w-ring-in"><b class="num">${Math.round(s.ratio * 100)}%</b><small>used</small></div></div>`; } },
  today: { name: 'Today', size: 's', ic: 'bolt', desc: 'Spent today', render() { const s = stats(); return `${head('bolt', 'Today')}${big(money(s.today))}<div class="w-meter"><i style="--p:${Math.min(1, s.today / Math.max(1, store.s.dailyBudget))}"></i></div><div class="w-sub">of ${money(store.s.dailyBudget)} daily</div>`; } },
  week: { name: 'This week', size: 's', ic: 'calendar', desc: 'Spent this week', render() { const s = stats(); return `${head('calendar', 'This week')}${big(money(s.week))}`; } },
  month: { name: 'This month', size: 's', ic: 'calendar', desc: 'Spent this month', render() { const s = stats(); return `${head('calendar', 'Month')}${big(money(s.month), s.monthCount + ' payments')}`; } },
  remaining: { name: 'Remaining', size: 's', ic: 'wallet', desc: 'Budget left this month', render() { const s = stats(); return `${head('wallet', 'Left')}${big(money(s.remaining), s.daysLeft + ' days to go')}`; } },
  allowance: { name: 'Daily allowance', size: 's', ic: 'spark', desc: 'Safe to spend per day', render() { const s = stats(); return `${head('spark', 'Safe / day')}${big(money(Math.floor(s.allowance)))}<div class="w-sub">to finish on budget</div>`; } },
  lastPay: { name: 'Last payment', size: 'w', ic: 'history', desc: 'Most recent payment', render() { const t = store.data.tx[0]; if (!t) return `${head('history', 'Last payment')}<div class="w-empty">No payments yet — scan your first QR</div>`; const c = store.cat(t.cat); return `${head('history', 'Last payment')}<div class="w-row" data-act="tx:${t.id}"><div class="av" style="--c:${c.color}">${c.icon}</div><div class="grow"><b>${esc(t.pn || t.pa || 'Payment')}</b><small>${timeAgo(t.ts)} · ${esc(t.note || c.name)}</small></div><b class="num">${money(t.am)}</b></div>`; } },
  topCat: { name: 'Top category', size: 's', ic: 'layers', desc: 'Where most money goes', render() { const t = topBy(x => x.cat); if (!t) return `${head('layers', 'Top category')}<div class="w-empty">—</div>`; const c = store.cat(t[0]); return `${head('layers', 'Top category')}<div class="w-emoji">${c.icon}</div><div class="w-title">${esc(c.name)}</div><div class="w-sub num">${money(t[1])}</div>`; } },
  topPayee: { name: 'Top payee', size: 's', ic: 'user', desc: 'Who you pay most', render() { const t = topBy(x => x.pa); if (!t) return `${head('user', 'Top payee')}<div class="w-empty">—</div>`; const p = store.data.payees[t[0]] || {}; return `${head('user', 'Top payee')}<div class="w-title">${esc(p.pn || t[0])}</div><div class="w-sub num">${money(t[1])} this month</div>`; } },
  donut: { name: 'Category donut', size: 'w', ic: 'palette', desc: 'Month split by category', render() { const s = stats(); const parts = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ v, color: store.cat(k).color, name: store.cat(k).name, icon: store.cat(k).icon })); if (!parts.length) return `${head('palette', 'Categories')}<div class="w-empty">Pay something to see your split</div>`; return `${head('palette', 'Categories')}<div class="w-donut">${donut(parts, 96, 13)}<ul>${parts.slice(0, 4).map(p => `<li><i style="background:${p.color}"></i>${p.icon} ${esc(p.name)}<b class="num">${compact(p.v)}</b></li>`).join('')}</ul></div>`; } },
  bars7: { name: '7-day bars', size: 'w', ic: 'stats', desc: 'Daily spend this week', render() { const d = daily(7); const L = d.map(x => 'SMTWTFS'[new Date(x.ts).getDay()]); return `${head('stats', 'Last 7 days')}${bars(d.map(x => x.v), 64, L)}`; } },
  spark30: { name: '30-day trend', size: 'w', ic: 'stats', desc: 'Spending curve', render() { const d = daily(30); return `${head('stats', '30-day trend')}<div class="w-big num sm">${money(sum(paid({ range: '30d' })))}</div>${spark(d.map(x => x.v))}`; } },
  income: { name: 'Money in', size: 's', ic: 'wallet', desc: 'Income this month and net', act: 'income', render() { const m = monthIncome(); return `${head('wallet', 'Money in')}${big('+' + money(m))}<div class="w-sub">net ${money(m - stats().month)}</div>`; } },
  receive: { name: 'Receive money', size: 's', ic: 'scan', desc: 'Your own UPI QR to get paid', render() { return `<div class="w-quick" data-act="receive"><div class="w-scanorb alt">${icon('download')}</div><b>Receive</b><small>Show your QR</small></div>`; } },
  split: { name: 'Split a bill', size: 's', ic: 'user', desc: 'Share a bill and request money', render() { return `<div class="w-quick" data-act="split"><div class="w-scanorb alt2">${icon('user')}</div><b>Split bill</b><small>Request shares</small></div>`; } },
  bills: { name: 'Bills & reminders', size: 'w', ic: 'calendar', desc: 'What is due this month', render() { const L = dueList().slice(0, 3); return `${head('calendar', 'Bills & reminders')}${L.length ? `<div class="w-bills" data-act="bills">${L.map(b => `<div class="${b.paid ? 'paid' : b.inDays < 0 ? 'late' : b.inDays <= 3 ? 'soon' : ''}"><b>${esc(b.name)}</b><span>${money(b.am, { force: true })}</span><small>${b.paid ? 'paid ✓' : b.inDays < 0 ? 'overdue' : b.inDays === 0 ? 'today' : 'in ' + b.inDays + 'd'}</small></div>`).join('')}</div>` : `<div class="w-empty" data-act="bills">Tap to add rent, recharge, Wi-Fi…</div>`}`; } },
  quickPay: { name: 'Quick scan', size: 's', ic: 'scan', desc: 'One-tap scanner', render() { return `<div class="w-quick" data-act="scan"><div class="w-scanorb">${icon('scan')}</div><b>Scan & Pay</b><small>Instant lock</small></div>`; } },
  quickAmounts: { name: 'Quick amounts', size: 'w', ic: 'bolt', desc: 'Scan with amount ready', render() { return `${head('bolt', 'Scan with amount')}<div class="w-chips">${store.s.quickAmounts.slice(0, 6).map(a => `<button class="chip" data-act="scanamt:${a}">${money(a, { force: true })}</button>`).join('')}</div>`; } },
  streak: { name: 'Streak', size: 's', ic: 'fire', desc: 'Days under daily budget', render() { const n = streak(); return `${head('fire', 'Streak')}<div class="w-big num">${n}<small> days</small></div><div class="w-flames">${'🔥'.repeat(Math.min(5, Math.max(1, Math.ceil(n / 3))))}</div>`; } },
  pending: { name: 'Pending', size: 's', ic: 'alert', desc: 'Payments to confirm', render() { const s = stats(); return `${head('alert', 'To confirm')}<div class="w-big num">${s.pending}</div><div class="w-sub">${s.pending ? 'tap to review' : 'all clear ✓'}</div>`; }, act: 'go:history:pending' },
  biggest: { name: 'Biggest spend', size: 's', ic: 'star', desc: 'Largest payment this month', render() { const t = paid({ range: 'month' }).sort((a, b) => b.am - a.am)[0]; return `${head('star', 'Biggest')}${t ? big(money(t.am), esc(t.pn || t.pa)) : '<div class="w-empty">—</div>'}`; } },
  average: { name: 'Average', size: 's', ic: 'target', desc: 'Average payment', render() { const p = paid({ range: 'month' }); return `${head('target', 'Avg / payment')}${big(money(p.length ? sum(p) / p.length : 0, { dec: 0 }))}`; } },
  count: { name: 'Payments', size: 's', ic: 'list', desc: 'Number of payments', render() { return `${head('list', 'Payments')}${big(paid({ range: 'month' }).length, 'this month')}`; } },
  food: { name: 'Food spend', size: 's', ic: 'fire', desc: 'Food this month', render() { const c = store.cat('food'); return `${head('fire', c.name)}<div class="w-emoji">${c.icon}</div>${big(money(sum(paid({ range: 'month', cat: 'food' }))))}`; } },
  study: { name: 'Assignment spend', size: 's', ic: 'edit', desc: 'Study & prints this month', render() { const c = store.cat('study'); return `${head('edit', c.name)}<div class="w-emoji">${c.icon}</div>${big(money(sum(paid({ range: 'month', cat: 'study' }))))}`; } },
  heatmap: { name: 'Spend heatmap', size: 'w', ic: 'grid', desc: 'Last 5 weeks, day by day', render() { return `${head('grid', '5-week heatmap')}${heat()}`; } },
  goal: { name: 'Savings goal', size: 'w', ic: 'target', desc: 'Progress to your goal', render() { const s = store.s; const p = s.goalAmount ? s.goalSaved / s.goalAmount : 0; return `${head('target', 'Goal · ' + s.goalName)}<div class="w-goal"><div class="w-big num sm">${money(s.goalSaved)}<small> / ${money(s.goalAmount)}</small></div><div class="w-meter lg"><i style="--p:${Math.min(1, p)}"></i></div><div class="w-chips"><button class="chip" data-act="goal:50">+${money(50, { force: true })}</button><button class="chip" data-act="goal:100">+${money(100, { force: true })}</button><button class="chip" data-act="goal:500">+${money(500, { force: true })}</button></div></div>`; } },
  greeting: { name: 'Greeting', size: 'w', ic: 'spark', desc: 'Time-aware hello', render() { const h = new Date().getHours(); const g = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'; return `<div class="w-greet"><div class="w-kicker">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div><div class="w-title xl">${g}, ${esc(store.s.name)}</div></div>`; } },
  favorites: { name: 'Favourite payees', size: 'w', ic: 'star', desc: 'Pay saved people in one tap', render() { const fav = Object.values(store.data.payees).filter(p => p.fav).slice(0, 4); if (!fav.length) return `${head('star', 'Favourites')}<div class="w-empty">Star a payee from history to pin it here</div>`; return `${head('star', 'Favourites')}<div class="w-favs">${fav.map(p => { const c = store.cat(p.cat); return `<button class="fav" data-act="payfav:${esc(p.pa)}"><span class="av" style="--c:${c.color}">${esc((p.pn || p.pa)[0].toUpperCase())}</span><small>${esc((p.pn || p.pa).split(' ')[0])}</small></button>`; }).join('')}</div>`; } },
  noSpend: { name: 'No-spend days', size: 's', ic: 'check', desc: 'Days with zero spend', render() { const d = daily(new Date().getDate()); const n = d.filter(x => x.v === 0).length; return `${head('check', 'No-spend days')}${big(n, 'this month')}`; } },
  forecast: { name: 'Forecast', size: 's', ic: 'spark', desc: 'Projected month total', render() { const s = stats(); const over = s.forecast > store.s.monthlyBudget; return `${head('spark', 'Forecast')}${big(compact(s.forecast))}<div class="w-sub ${over ? 'bad' : 'good'}">${over ? 'over budget' : 'on track'}</div>`; } },
};

/* ---------------- Custom widgets ---------------- */
export const METRICS = { sum: 'Total spent', count: 'Payment count', avg: 'Average payment', max: 'Biggest payment', left: 'Budget left' };
export const RANGES = { today: 'Today', week: 'This week', month: 'This month', '7d': 'Last 7 days', '30d': 'Last 30 days', year: 'This year', all: 'All time' };
export const DISPLAYS = { number: 'Big number', ring: 'Ring vs target', bars: '7-day bars', spark: 'Trend line', meter: 'Progress bar' };

export function customValue(cfg) {
  const list = paid({ range: cfg.range === 'all' ? null : cfg.range, cat: cfg.cat });
  switch (cfg.metric) {
    case 'count': return list.length;
    case 'avg': return list.length ? sum(list) / list.length : 0;
    case 'max': return list.reduce((m, t) => Math.max(m, +t.am), 0);
    case 'left': return Math.max(0, (+cfg.target || store.s.monthlyBudget) - sum(list));
    default: return sum(list);
  }
}
// code widgets: your own HTML with live placeholders (scripts and inline handlers are stripped)
function renderTemplate(cfg, v) {
  const s = stats(), st = store.s, target = +cfg.target || 0, isMoney = cfg.metric !== 'count';
  const vars = { value: isMoney ? money(v, { dec: 0 }) : v, raw: v, target: isMoney ? money(target, { dec: 0 }) : target, pct: target ? Math.round(v / target * 100) : 0,
    today: money(s.today), week: money(s.week), month: money(s.month), left: money(s.remaining), safe: money(Math.floor(s.allowance)), budget: money(st.monthlyBudget),
    title: esc(cfg.title || ''), icon: esc(cfg.icon || '✦'), name: esc((st.name || '').split(' ')[0]), color: esc(cfg.color || 'var(--a2)') };
  const html = String(cfg.html).replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta)[^>]*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, '');
  return `<div class="w-code">${html.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m)}</div>`;
}
export function renderCustom(cfg) {
  const v = customValue(cfg);
  if (cfg.html) return renderTemplate(cfg, v);
  const isMoney = cfg.metric !== 'count';
  const val = isMoney ? money(v, { dec: 0 }) : v;
  const target = +cfg.target || 0;
  let body = '';
  const catFilter = t => t.status === 'paid' && (!cfg.cat || cfg.cat === 'all' || t.cat === cfg.cat);
  if (cfg.display === 'ring') body = `<div class="w-ring">${ring(target ? v / target : 0, 74, 8)}<div class="w-ring-in"><b class="num">${target ? Math.round(v / target * 100) : 0}%</b><small>${isMoney ? compact(v) : v}</small></div></div>`;
  else if (cfg.display === 'bars') { const d = []; const t0 = startOfDay(); for (let i = 6; i >= 0; i--) { const f = t0 - i * DAY; d.push(sum(store.data.tx.filter(t => catFilter(t) && t.ts >= f && t.ts < f + DAY))); } body = `<div class="w-big num sm">${val}</div>${bars(d, 46)}`; }
  else if (cfg.display === 'spark') { const d = []; const t0 = startOfDay(); for (let i = 29; i >= 0; i--) { const f = t0 - i * DAY; d.push(sum(store.data.tx.filter(t => catFilter(t) && t.ts >= f && t.ts < f + DAY))); } body = `<div class="w-big num sm">${val}</div>${spark(d)}`; }
  else if (cfg.display === 'meter') body = `<div class="w-big num">${val}</div><div class="w-meter lg"><i style="--p:${target ? Math.min(1, v / target) : 0}"></i></div><div class="w-sub">${target ? 'of ' + (isMoney ? money(target) : target) : ''}</div>`;
  else body = big(val, RANGES[cfg.range] + (cfg.cat && cfg.cat !== 'all' ? ' · ' + store.cat(cfg.cat).name : ''));
  return `<div class="w-head"><span class="w-ic">${esc(cfg.icon || '✦')}</span><span>${esc(cfg.title || METRICS[cfg.metric])}</span></div>${body}`;
}

export function renderWidget(w, editing = false) {
  let def, html, size, tint = '';
  if (w.type === 'custom') {
    const cfg = store.data.customWidgets.find(c => c.id === w.ref);
    if (!cfg) return '';
    html = renderCustom(cfg); size = cfg.size || 's'; tint = cfg.color ? `style="--tint:${cfg.color}"` : '';
  } else {
    def = CATALOG[w.type]; if (!def) return '';
    try { html = def.render(); } catch (e) { html = `<div class="w-empty">widget error</div>`; console.error(e); }
    size = w.size || def.size;
  }
  const act = def && def.act ? `data-act="${def.act}"` : '';
  return `<div class="widget glass size-${size} ${w.type === 'custom' ? 'custom' : ''} ${w.type === 'creature' ? 'clear' : ''}" data-wid="${w.id}" ${act} ${tint}>
    <div class="w-shine"></div>${html}
    ${editing ? `${w.type !== 'custom' ? `<button class="w-sz" data-wsz="${w.id}" aria-label="Resize">${icon('zoom')}</button>` : ''}<button class="w-x" data-wx="${w.id}" aria-label="Remove">${icon('close')}</button>${w.type === 'custom' ? `<button class="w-e" data-we="${w.ref}" aria-label="Edit">${icon('edit')}</button>` : ''}<div class="w-drag">${icon('drag')}</div>` : ''}
  </div>`;
}

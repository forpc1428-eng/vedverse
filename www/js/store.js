// Vedverse — state, persistence & analytics
const KEY = 'vedverse.v1';

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#ff9f43' },
  { id: 'study', name: 'Assignment', icon: '📚', color: '#5f9bff' },
  { id: 'travel', name: 'Travel', icon: '🚕', color: '#ffd166' },
  { id: 'shop', name: 'Shopping', icon: '🛍️', color: '#ff5fa2' },
  { id: 'bills', name: 'Bills', icon: '💡', color: '#7cf0c5' },
  { id: 'friends', name: 'Friends', icon: '🤝', color: '#b38cff' },
  { id: 'fun', name: 'Fun', icon: '🎮', color: '#ff6b6b' },
  { id: 'health', name: 'Health', icon: '💊', color: '#4ee3a0' },
  { id: 'other', name: 'Other', icon: '✨', color: '#a9b4d0' },
];

export const DEFAULT_SETTINGS = {
  name: 'Vedant',
  theme: 'nebula',
  font: 'sora',
  radius: 26,
  blur: 26,
  grain: true,
  liquid: true,
  three: true,
  bhEngine: 'video',
  idIcon: 0, idName: '',      // the icon + name picked in “App icon & name” (shown inside the app too)      // video = pre-rendered black hole (zero lag) | live = real-time ray tracing
  quality: 'auto',          // low | med | high | auto
  particles: 1,             // multiplier 0.3..1.6
  creature: true,
  parallax: true,
  intro: true,
  reducedMotion: false,
  haptics: true,
  sounds: true,
  music: true,
  shatter: true,
  portal: true,
  receipt: true,
  breath: false,
  breathAbove: 2000,
  scanOnLaunch: false,
  scanEngine: 'auto',       // auto | native | web
  scanBeep: true,
  scanVibrate: true,
  scanTorch: 'auto',        // auto | on | off
  autoOpenAfterScan: false, // jump straight to keypad (always) – kept for future
  continuousScan: false,
  payMode: 'smart',         // smart | original | noamount | always
  amountFormat: 'plain',  // decimal (50.00) | plain (50)
  noteToApp: true,
  askApp: true,
  defaultApp: '',
  autoConfirm: true,
  monthlyBudget: 6000,
  dailyBudget: 250,
  goalName: 'New headphones',
  goalAmount: 3000,
  goalSaved: 0,
  currency: '₹',
  weekStart: 1,
  hideAmounts: false,
  pin: '',
  lock: false,
  quickAmounts: [10, 20, 50, 100, 200, 500],
  quickNotes: ['Canteen', 'Assignment print', 'Chai', 'Auto', 'Xerox', 'Snacks'],
  showQuickAmounts: true,
  showQuickNotes: true,
  confettiOnSuccess: true,
  // ---- look
  fontFamily: '', fontScale: 1, fontBold: false, accent: '', glass: 60,
  // ---- universe
  bhSize: 1, bhX: 0, bhY: 0, bhSpin: 1, bhBright: 1,
  timeOfDay: false, tod: { morning: '#ffd29a', day: '#ffffff', evening: '#ff8a5c', night: '#8fa8ff' }, todStrength: 0.45,
  customThemes: {},
  // ---- home
  greetings: true, greetStyle: 'all', dock: ['home', 'history', 'stats', 'settings'], widgetsFollowTheme: true,
  // ---- payments
  payOutside: false, recentPayees: true, calcKeypad: true, autoNotif: false, autoSms: false, receiptStyle: 'horizon', income: true,
  // ---- history
  timeline: true, locLog: false,
  // ---- notifications
  remindBills: true, budgetAlerts: true, weeklyDigest: false, remindHour: 9,
  notifTone: 'friendly', notifSound: 'chime', notifVib: 'soft', notifHeads: false, notifColor: '', notifPrivate: false, notifRich: true,
  notifQuiet: true, quietFrom: 22, quietTo: 7, notifMax: 4, quickBar: false, notifActions: true,
  nudgeCheckin: false, checkinHour: 21, nudgeLimit: true, nudgeStreak: true, nudgeNoSpend: true, nudgeGoal: true, nudgeMonthEnd: true,
  nudgePayday: false, paydayDay: 1, nudgeRecurring: true, nudgePending: true, nudgeFestival: false,
  // ---- security
  biometric: false,
  // ---- sound & touch
  hapticStrength: 'normal', soundPack: 'cosmic', animSpeed: 'normal',
  // ---- language & format
  lang: 'en', numFormat: 'indian', decimals: 'auto',
  dockLabels: true,
  appMode: 'scanner',        // scanner | budget (big switch at the top of Settings)
  lastManualCat: '', lastMethod: 'cash',
};

export const DEFAULT_WIDGETS = [
  { id: 'w1', type: 'creature' },
  { id: 'w2', type: 'budgetRing' },
  { id: 'w3', type: 'today' },
  { id: 'w4', type: 'allowance' },
  { id: 'w5', type: 'quickPay' },
  { id: 'w6', type: 'bars7' },
  { id: 'w7', type: 'lastPay' },
  { id: 'w8', type: 'donut' },
  { id: 'w9', type: 'favorites' },
  { id: 'w10', type: 'streak' },
];

function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

const listeners = new Set();
export const store = {
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    d = d || {};
    this.data = {
      settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
      tx: d.tx || [],
      categories: d.categories || DEFAULT_CATEGORIES.map(c => ({ ...c })),
      widgets: d.widgets || DEFAULT_WIDGETS.map(w => ({ ...w })),
      customWidgets: d.customWidgets || [],
      payees: d.payees || {},
      hw: d.hw || { over: {} },
      bills: d.bills || [],   // Bills & reminders
      income: d.income || [],  // money in
      events: d.events || [],
      reminders: d.reminders || [],   // Notification Studio: custom reminders
      nsent: d.nsent || {},            // once-only nudges already sent
      notifAsked: d.notifAsked || 0,  // full timeline (scans, payments, receipts, bills…)   // Widget Studio: per-design overrides for the home-screen widgets
      firstRun: d.firstRun === undefined ? true : d.firstRun,
      migr: d.migr || 0,
      noPrefill: d.noPrefill || {},
      catBudgets: d.catBudgets || {},  // Budget tracker: monthly limit per category   // per UPI app: refuses pre-filled amounts to personal IDs
    };
    // one-time clean-up (v2): strip the old demo data, always ask which UPI app, plain tap-to-pay
    if (this.data.migr < 2) {
      const demo = new Set(['canteen.ravi@oksbi', 'printhub@ybl', 'chaiwala@paytm', 'autorickshaw.m@okaxis', 'rahul.k@okhdfc', 'xeroxcorner@ibl', 'bookstore@upi', 'gamezone@ybl']);
      this.data.tx = this.data.tx.filter(t => !demo.has(t.pa));
      demo.forEach(pa => { delete this.data.payees[pa]; });
      this.data.settings.askApp = true;
      this.data.settings.breath = false;
      this.data.migr = 2;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    }
    // v3: new money tools appear on Home once (remove them any time with Edit)
    if (this.data.migr < 3) {
      const have = new Set(this.data.widgets.map(w => w.type));
      ['receive', 'split', 'bills'].forEach((type, i) => { if (!have.has(type)) this.data.widgets.splice(Math.min(4 + i, this.data.widgets.length), 0, { id: 'w' + type + Date.now().toString(36), type }); });
      this.data.migr = 3;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    }
    // v4: crystal-clear UI by default (film grain becomes opt-in)
    if (this.data.migr < 4) { this.data.settings.grain = false; this.data.migr = 4; try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} }
    // v5: send whole rupees as "10" (not "10.00"), the cleanest form for every UPI app
    if (this.data.migr < 5) { this.data.settings.amountFormat = 'plain'; this.data.migr = 5; try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {} }
    return this.data;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
    listeners.forEach(fn => { try { fn(this.data); } catch (e) { console.error(e); } });
  },
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get s() { return this.data.settings; },
  set(k, v) { this.data.settings[k] = v; this.save(); },
  addTx(t) {
    const tx = { id: uid(), ts: Date.now(), status: 'pending', cat: 'other', note: '', app: '', ...t };
    this.data.tx.unshift(tx);
    if (tx.pa) {
      const p = this.data.payees[tx.pa] || { pa: tx.pa, pn: tx.pn || '', count: 0, total: 0, fav: false, cat: tx.cat };
      p.pn = tx.pn || p.pn; p.cat = tx.cat || p.cat;
      this.data.payees[tx.pa] = p;
    }
    this.recalcPayees();
    this.save();
    return tx;
  },
  updateTx(id, patch) {
    const t = this.data.tx.find(x => x.id === id);
    if (t) Object.assign(t, patch);
    this.recalcPayees();
    this.save();
    return t;
  },
  deleteTx(id) {
    this.data.tx = this.data.tx.filter(x => x.id !== id);
    this.recalcPayees();
    this.save();
  },
  recalcPayees() {
    const P = this.data.payees;
    Object.values(P).forEach(p => { p.count = 0; p.total = 0; });
    this.data.tx.forEach(t => {
      if (!t.pa) return;
      const p = P[t.pa] || (P[t.pa] = { pa: t.pa, pn: t.pn || '', count: 0, total: 0, fav: false, cat: t.cat });
      if (t.status === 'paid') { p.count++; p.total += +t.am || 0; }
      p.last = Math.max(p.last || 0, t.ts);
    });
  },
  cat(id) { return this.data.categories.find(c => c.id === id) || this.data.categories[this.data.categories.length - 1] || DEFAULT_CATEGORIES[8]; },
  newId: uid,
};

/* ---------- time helpers ---------- */
export const DAY = 86400000;
export function startOfDay(t = Date.now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function startOfWeek(t = Date.now(), ws = 1) { const d = new Date(startOfDay(t)); const diff = (d.getDay() - ws + 7) % 7; return d.getTime() - diff * DAY; }
export function startOfMonth(t = Date.now()) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
export function daysInMonth(t = Date.now()) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

export function rangeStart(range) {
  const ws = store.s.weekStart;
  switch (range) {
    case 'today': return startOfDay();
    case 'week': return startOfWeek(Date.now(), ws);
    case 'month': return startOfMonth();
    case '7d': return startOfDay() - 6 * DAY;
    case '30d': return startOfDay() - 29 * DAY;
    case 'year': return new Date(new Date().getFullYear(), 0, 1).getTime();
    default: return 0;
  }
}

export function paid(filter = {}) {
  const from = filter.range ? rangeStart(filter.range) : (filter.from || 0);
  return store.data.tx.filter(t => t.status === 'paid' && t.ts >= from && (!filter.cat || filter.cat === 'all' || t.cat === filter.cat));
}
export const sum = arr => arr.reduce((a, t) => a + (+t.am || 0), 0);

export function stats() {
  const s = store.s;
  const today = sum(paid({ range: 'today' }));
  const week = sum(paid({ range: 'week' }));
  const monthTx = paid({ range: 'month' });
  const month = sum(monthTx);
  const remaining = Math.max(0, s.monthlyBudget - month);
  const dim = daysInMonth();
  const dayOfMonth = new Date().getDate();
  const daysLeft = dim - dayOfMonth + 1;
  const allowance = daysLeft > 0 ? (s.monthlyBudget - month + today) / daysLeft : 0;
  const ratio = s.monthlyBudget > 0 ? Math.min(1.5, month / s.monthlyBudget) : 0;
  // health: 1 calm, 0 critical. Compare spend pace with time pace.
  const timePace = dayOfMonth / dim;
  const pace = s.monthlyBudget > 0 ? (month / s.monthlyBudget) / Math.max(0.05, timePace) : 0;
  let health = 1 - Math.max(0, Math.min(1, (pace - 0.85) / 0.9));
  if (ratio >= 1) health = Math.min(health, 0.08);
  const byCat = {};
  monthTx.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + (+t.am || 0); });
  const forecast = timePace > 0 ? month / timePace : 0;
  const pending = store.data.tx.filter(t => t.status === 'pending').length;
  return { today, week, month, remaining, allowance: Math.max(0, allowance), ratio, health, byCat, forecast, daysLeft, pending, monthCount: monthTx.length };
}

export function daily(n = 7) {
  const out = [];
  const t0 = startOfDay();
  for (let i = n - 1; i >= 0; i--) {
    const from = t0 - i * DAY, to = from + DAY;
    const v = sum(store.data.tx.filter(t => t.status === 'paid' && t.ts >= from && t.ts < to));
    out.push({ ts: from, v });
  }
  return out;
}

export function streak() {
  // consecutive days (ending yesterday or today) with spend <= daily budget
  const db = store.s.dailyBudget;
  let n = 0;
  const d = daily(60).reverse();
  for (const x of d) { if (x.v <= db) n++; else break; }
  return n;
}

const NF = {};   // cached number formatters (building one per call was a top cost when lists render)
export function money(v, opts = {}) {
  const s = store.s;
  if (s.hideAmounts && !opts.force) return s.currency + '•••';
  const n = Math.abs(+v || 0);
  let dec = opts.dec !== undefined ? opts.dec : (n % 1 ? 2 : 0);
  if (opts.dec === undefined && s.decimals === 'always') dec = 2;
  if (opts.dec === undefined && s.decimals === 'never') dec = 0;
  const sign = v < 0 ? '−' : '';
  if (s.numFormat === 'compact' && n >= 1000 && !opts.full) {
    const f = n >= 1e7 ? [n / 1e7, 'Cr'] : n >= 1e5 ? [n / 1e5, 'L'] : [n / 1e3, 'K'];
    return sign + s.currency + (+f[0].toFixed(f[0] >= 100 ? 0 : 1)) + f[1];
  }
  const loc = s.numFormat === 'intl' ? 'en-US' : 'en-IN', fk = loc + dec;
  const nf = NF[fk] || (NF[fk] = new Intl.NumberFormat(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  return sign + s.currency + nf.format(n);
}
export function compact(v) {
  if (store.s.hideAmounts) return store.s.currency + '•••';
  const n = +v || 0;
  if (n >= 100000) return store.s.currency + (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (n >= 1000) return store.s.currency + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return store.s.currency + Math.round(n);
}
export function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < DAY) return Math.floor(d / 3600000) + 'h ago';
  if (d < 7 * DAY) return Math.floor(d / DAY) + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }

/* ---------- import / export ---------- */
export function exportJSON() {
  return JSON.stringify({ app: 'Vedverse', version: 1, exported: new Date().toISOString(), ...store.data }, null, 2);
}
export function exportCSV() {
  const rows = [['id', 'date', 'time', 'payee_name', 'upi_id', 'amount', 'category', 'note', 'status', 'app', 'ref']];
  store.data.tx.forEach(t => {
    const d = new Date(t.ts);
    rows.push([t.id, d.toLocaleDateString('en-CA'), d.toTimeString().slice(0, 8), t.pn || '', t.pa || '', t.am, store.cat(t.cat).name, t.note || '', t.status, t.app || '', t.ref || '']);
  });
  return rows.map(r => r.map(c => { c = String(c ?? ''); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',')).join('\n');
}
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
export function importData(text, mode = 'merge') {
  text = text.trim();
  let incoming = [];
  if (text.startsWith('{')) {
    const j = JSON.parse(text);
    incoming = j.tx || [];
    if (mode === 'replace') {
      if (j.settings) store.data.settings = { ...DEFAULT_SETTINGS, ...j.settings };
      if (j.categories) store.data.categories = j.categories;
      if (j.widgets) store.data.widgets = j.widgets;
      if (j.customWidgets) store.data.customWidgets = j.customWidgets;
      if (j.payees) store.data.payees = j.payees;
    }
  } else {
    const rows = parseCSV(text);
    const head = rows.shift().map(h => h.trim().toLowerCase());
    const ix = n => head.indexOf(n);
    incoming = rows.map(r => {
      const date = r[ix('date')] || '', time = r[ix('time')] || '00:00:00';
      const catName = (r[ix('category')] || '').toLowerCase();
      const cat = (store.data.categories.find(c => c.name.toLowerCase() === catName) || {}).id || 'other';
      const ts = Date.parse(date + 'T' + time) || Date.now();
      return { id: r[ix('id')] || uid(), ts, pn: r[ix('payee_name')] || '', pa: r[ix('upi_id')] || '', am: +r[ix('amount')] || 0, cat, note: r[ix('note')] || '', status: (r[ix('status')] || 'paid').toLowerCase(), app: r[ix('app')] || '', ref: r[ix('ref')] || '' };
    });
  }
  if (mode === 'replace') store.data.tx = [];
  const ids = new Set(store.data.tx.map(t => t.id));
  let added = 0;
  incoming.forEach(t => { if (!ids.has(t.id)) { store.data.tx.push(t); added++; } });
  store.data.tx.sort((a, b) => b.ts - a.ts);
  store.recalcPayees();
  store.save();
  return added;
}

export function seedDemo() {
  const names = [['canteen.ravi@oksbi', 'Ravi Canteen', 'food'], ['printhub@ybl', 'Print Hub', 'study'], ['chaiwala@paytm', 'Chai Point', 'food'], ['autorickshaw.m@okaxis', 'Manoj Auto', 'travel'], ['rahul.k@okhdfc', 'Rahul', 'friends'], ['xeroxcorner@ibl', 'Xerox Corner', 'study'], ['bookstore@upi', 'Campus Books', 'study'], ['gamezone@ybl', 'Game Zone', 'fun']];
  const now = Date.now();
  for (let i = 0; i < 46; i++) {
    const [pa, pn, cat] = names[Math.floor(Math.random() * names.length)];
    const am = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250][Math.floor(Math.random() * 12)];
    const ts = now - Math.random() * 26 * DAY;
    store.data.tx.push({ id: uid(), ts, pa, pn, am, cat, note: '', status: Math.random() < 0.93 ? 'paid' : (Math.random() < 0.5 ? 'failed' : 'pending'), app: ['gpay', 'phonepe', 'paytm'][i % 3] });
  }
  store.data.tx.sort((a, b) => b.ts - a.ts);
  store.data.payees['canteen.ravi@oksbi'] = { ...(store.data.payees['canteen.ravi@oksbi'] || {}), pa: 'canteen.ravi@oksbi', pn: 'Ravi Canteen', fav: true, cat: 'food' };
  store.data.payees['printhub@ybl'] = { pa: 'printhub@ybl', pn: 'Print Hub', fav: true, cat: 'study' };
  store.data.payees['chaiwala@paytm'] = { pa: 'chaiwala@paytm', pn: 'Chai Point', fav: true, cat: 'food' };
  store.recalcPayees();
  store.save();
}

// Vedverse — extras: greetings, offline places, timeline + location, auto-confirm, reminders, biometric unlock,
// universe receipts (22 styles), PDF statements, income, theme builder, time of day, dock editor, languages.
// Everything runs on the phone; nothing needs the internet.
import { store, stats, money, timeAgo } from './store.js';
import * as UPI from './upi.js';
import { icon } from './icons.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, el = document) => el.querySelector(s);
const X = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VedExtras) || null;
const rnd = a => a[Math.floor(Math.random() * a.length)];

/* ================================================================== greetings */
const G = {
  late: ['Up late, {n}?', 'Night owl mode, {n}', 'The universe is quiet, {n}', 'Stars are out, {n}', 'Still awake, {n}?'],
  dawn: ['Early start, {n}', 'First light, {n}', 'Rise and shine, {n}', 'Fresh morning, {n}'],
  morning: ['Good morning, {n}', 'Morning, {n} ☀️', 'Have a bright day, {n}', 'Chai time, {n}?', 'Let’s spend smart today, {n}'],
  noon: ['Good afternoon, {n}', 'Lunch break, {n}?', 'Halfway through the day, {n}', 'Keep the pace, {n}'],
  afternoon: ['Good afternoon, {n}', 'Afternoon glow, {n}', 'Steady orbit, {n}', 'Doing great, {n}'],
  evening: ['Good evening, {n}', 'Evening calm, {n}', 'Golden hour, {n}', 'Wind down, {n}'],
  night: ['Good night, {n}', 'Calm night, {n}', 'Rest well, {n} 🌙', 'Another day in orbit, {n}'],
  mon: ['Fresh week, {n}', 'New week, new budget, {n}'], fri: ['Happy Friday, {n}', 'Weekend’s close, {n}'], sat: ['Happy Saturday, {n}', 'Weekend mode, {n}'], sun: ['Happy Sunday, {n}', 'Easy Sunday, {n}'],
  good: ['On track, {n} ✦', 'Calm horizon, {n}', 'Spending like a pro, {n}'], warm: ['Heating up, {n}', 'Watch the pace, {n}'], hot: ['Go gentle today, {n}', 'Budget’s tight, {n}'],
};
export const FEST = { '01-01': 'Happy New Year, {n} 🎆', '01-14': 'Happy Makar Sankranti, {n} 🪁', '01-26': 'Happy Republic Day, {n} 🇮🇳', '08-15': 'Happy Independence Day, {n} 🇮🇳', '10-02': 'Gandhi Jayanti, {n}', '12-25': 'Merry Christmas, {n} 🎄', '12-31': 'Last day of the year, {n} ✨',
  '2026-11-08': 'Happy Diwali, {n} 🪔', '2026-03-04': 'Happy Holi, {n} 🎨', '2026-03-20': 'Eid Mubarak, {n} 🌙', '2026-08-28': 'Happy Raksha Bandhan, {n}', '2026-09-14': 'Happy Ganesh Chaturthi, {n} 🙏', '2026-10-20': 'Happy Dussehra, {n}', '2027-10-29': 'Happy Diwali, {n} 🪔', '2027-03-22': 'Happy Holi, {n} 🎨' };
let greetCache = null;
export function greeting() {
  const s = store.s; if (!s.greetings) return '';
  const now = new Date(), key = now.toDateString() + now.getHours() + s.greetStyle;
  if (greetCache && greetCache.k === key) return greetCache.v;
  const n = (s.name || '').split(' ')[0] || 'there', h = now.getHours();
  const iso = now.toISOString().slice(0, 10), md = iso.slice(5);
  const style = s.greetStyle;
  let pool = [];
  if ((style === 'all' || style === 'festival') && (FEST[iso] || FEST[md])) pool = [FEST[iso] || FEST[md]];
  else {
    const slot = h < 4 ? 'late' : h < 7 ? 'dawn' : h < 12 ? 'morning' : h < 14 ? 'noon' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : h < 24 ? 'night' : 'late';
    pool = G[slot].slice();
    if (style === 'all' || style === 'day') { const d = ['sun', 'mon', '', '', '', 'fri', 'sat'][now.getDay()]; if (d) pool = pool.concat(G[d]); }
    if (style === 'all' || style === 'mood') { const st = stats(); pool = pool.concat(st.health > .7 ? G.good : st.health > .4 ? G.warm : G.hot); }
  }
  const v = rnd(pool).replace('{n}', esc(n));
  greetCache = { k: key, v }; return v;
}

/* ================================================================== offline places (nearest city/area) */
const PLACES = [['Mumbai', 19.076, 72.878], ['Navi Mumbai', 19.033, 73.03], ['Thane', 19.218, 72.978], ['Andheri, Mumbai', 19.119, 72.847], ['Bandra, Mumbai', 19.06, 72.836], ['Powai, Mumbai', 19.118, 72.906], ['Dadar, Mumbai', 19.018, 72.843], ['Borivali, Mumbai', 19.229, 72.857], ['Kalyan', 19.243, 73.13], ['Vasai-Virar', 19.391, 72.84], ['Panvel', 18.989, 73.117],
  ['Pune', 18.52, 73.857], ['Pimpri-Chinchwad', 18.629, 73.8], ['Hinjewadi, Pune', 18.591, 73.739], ['Kothrud, Pune', 18.507, 73.807], ['Nashik', 19.998, 73.79], ['Nagpur', 21.146, 79.088], ['Aurangabad', 19.876, 75.343], ['Solapur', 17.66, 75.906], ['Kolhapur', 16.705, 74.243], ['Amravati', 20.937, 77.78], ['Nanded', 19.138, 77.321], ['Satara', 17.68, 74.018], ['Sangli', 16.852, 74.581], ['Jalgaon', 21.003, 75.563], ['Akola', 20.7, 77.007], ['Latur', 18.408, 76.576], ['Ahmednagar', 19.095, 74.749], ['Ratnagiri', 16.99, 73.312], ['Lonavala', 18.75, 73.407],
  ['Delhi', 28.614, 77.209], ['New Delhi', 28.613, 77.229], ['Noida', 28.535, 77.391], ['Greater Noida', 28.474, 77.504], ['Gurugram', 28.459, 77.027], ['Faridabad', 28.408, 77.317], ['Ghaziabad', 28.669, 77.454], ['Dwarka, Delhi', 28.592, 77.046], ['Rohini, Delhi', 28.736, 77.113], ['Saket, Delhi', 28.524, 77.206],
  ['Bengaluru', 12.972, 77.594], ['Whitefield, Bengaluru', 12.97, 77.75], ['Koramangala, Bengaluru', 12.935, 77.624], ['Electronic City, Bengaluru', 12.845, 77.66], ['Mysuru', 12.296, 76.639], ['Mangaluru', 12.915, 74.856], ['Hubballi', 15.365, 75.124], ['Belagavi', 15.85, 74.498], ['Davanagere', 14.464, 75.922], ['Udupi', 13.341, 74.747],
  ['Chennai', 13.083, 80.271], ['Coimbatore', 11.017, 76.956], ['Madurai', 9.925, 78.12], ['Tiruchirappalli', 10.79, 78.705], ['Salem', 11.664, 78.146], ['Tirunelveli', 8.714, 77.757], ['Vellore', 12.916, 79.133], ['Puducherry', 11.942, 79.808],
  ['Hyderabad', 17.385, 78.487], ['Secunderabad', 17.44, 78.498], ['HITEC City, Hyderabad', 17.445, 78.377], ['Warangal', 17.968, 79.594], ['Visakhapatnam', 17.687, 83.218], ['Vijayawada', 16.506, 80.648], ['Guntur', 16.307, 80.436], ['Tirupati', 13.629, 79.419], ['Nellore', 14.443, 79.987],
  ['Kolkata', 22.573, 88.364], ['Howrah', 22.596, 88.264], ['Salt Lake, Kolkata', 22.58, 88.413], ['Durgapur', 23.52, 87.312], ['Asansol', 23.684, 86.983], ['Siliguri', 26.727, 88.395],
  ['Ahmedabad', 23.023, 72.571], ['Gandhinagar', 23.216, 72.637], ['Surat', 21.17, 72.831], ['Vadodara', 22.307, 73.181], ['Rajkot', 22.303, 70.802], ['Bhavnagar', 21.762, 72.152], ['Jamnagar', 22.47, 70.058],
  ['Jaipur', 26.912, 75.787], ['Jodhpur', 26.239, 73.024], ['Udaipur', 24.585, 73.712], ['Kota', 25.213, 75.865], ['Ajmer', 26.45, 74.64], ['Bikaner', 28.022, 73.312],
  ['Lucknow', 26.847, 80.947], ['Kanpur', 26.449, 80.331], ['Varanasi', 25.318, 82.974], ['Prayagraj', 25.436, 81.846], ['Agra', 27.177, 78.008], ['Meerut', 28.984, 77.706], ['Bareilly', 28.367, 79.43], ['Aligarh', 27.898, 78.088], ['Gorakhpur', 26.76, 83.373], ['Mathura', 27.492, 77.674],
  ['Bhopal', 23.26, 77.413], ['Indore', 22.72, 75.858], ['Gwalior', 26.218, 78.183], ['Jabalpur', 23.181, 79.986], ['Ujjain', 23.18, 75.785],
  ['Patna', 25.594, 85.138], ['Gaya', 24.796, 85.008], ['Ranchi', 23.344, 85.31], ['Jamshedpur', 22.805, 86.203], ['Dhanbad', 23.796, 86.43],
  ['Bhubaneswar', 20.296, 85.825], ['Cuttack', 20.463, 85.883], ['Raipur', 21.251, 81.63], ['Bilaspur', 22.08, 82.148],
  ['Chandigarh', 30.733, 76.779], ['Mohali', 30.704, 76.717], ['Ludhiana', 30.901, 75.857], ['Amritsar', 31.634, 74.872], ['Jalandhar', 31.326, 75.576], ['Patiala', 30.34, 76.386],
  ['Dehradun', 30.317, 78.032], ['Haridwar', 29.945, 78.164], ['Rishikesh', 30.087, 78.268], ['Shimla', 31.105, 77.173], ['Manali', 32.24, 77.189], ['Jammu', 32.727, 74.857], ['Srinagar', 34.084, 74.797], ['Leh', 34.152, 77.577],
  ['Kochi', 9.931, 76.267], ['Thiruvananthapuram', 8.524, 76.937], ['Kozhikode', 11.258, 75.78], ['Thrissur', 10.527, 76.214], ['Kannur', 11.874, 75.37],
  ['Guwahati', 26.144, 91.736], ['Shillong', 25.578, 91.893], ['Imphal', 24.817, 93.937], ['Agartala', 23.831, 91.287], ['Gangtok', 27.338, 88.606], ['Panaji', 15.49, 73.828], ['Margao', 15.273, 73.958], ['Port Blair', 11.623, 92.726]];
export function place(lat, lon) {
  if (lat == null) return '';
  let best = null, bd = 1e9;
  for (const [n, a, b] of PLACES) { const d = (a - lat) ** 2 + ((b - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd) { bd = d; best = n; } }
  const km = Math.sqrt(bd) * 111;
  return km < 12 ? best : km < 60 ? `near ${best}` : `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}
let locCache = null;
export async function getLoc(ask = false) {
  if (!store.s.locLog && !ask) return null;
  if (locCache && Date.now() - locCache.at < 60000) return locCache.v;
  const P = X(); if (!P) return null;
  try { const r = await P.getLocation(); const v = { lat: +r.lat.toFixed(6), lon: +r.lon.toFixed(6), acc: Math.round(r.acc), place: place(r.lat, r.lon) }; locCache = { at: Date.now(), v }; return v; } catch (e) { return null; }
}

/* ================================================================== full timeline */
export function logEvent(kind, data = {}) {
  if (!store.s.timeline) return null;
  const ev = { id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Date.now(), kind, ...data };
  const list = store.data.events; list.unshift(ev); if (list.length > 6000) list.length = 6000;
  store.save();
  if (store.s.locLog) getLoc().then(l => { if (l) { ev.loc = l; store.save(); } });
  return ev;
}
const KIND = { scan: ['scan', 'Scanned a payment QR'], 'scan-other': ['scan', 'Scanned a QR (not a payment)'], paste: ['paste', 'Pasted a UPI ID'], 'pay-start': ['bolt', 'Started a payment'], paid: ['check', 'Payment confirmed'], pending: ['history', 'Payment pending'], failed: ['alert', 'Payment failed'], cancelled: ['close', 'Payment cancelled'], auto: ['check', 'Auto-confirmed from notification'], receipt: ['share', 'Shared a receipt'], bill: ['calendar', 'Bill'], income: ['download', 'Money in'], icon: ['spark', 'Changed app icon / name'], theme: ['palette', 'Changed theme'], statement: ['download', 'Made a PDF statement'] };
export function timelineHTML(q = '') {
  const ql = q.toLowerCase();
  const list = store.data.events.filter(e => !ql || JSON.stringify(e).toLowerCase().includes(ql)).slice(0, 250);   // newest 250: keeps the timeline instant
  if (!list.length) return `<div class="empty"><div class="big-e">🛰️</div>${store.s.timeline ? 'Your timeline is empty.<br>Scans, payments and more will appear here.' : 'Timeline is off. Turn it on in Settings → History & data.'}</div>`;
  const groups = {}; list.forEach(e => { const d = new Date(e.t).toDateString(); (groups[d] = groups[d] || []).push(e); });
  return Object.entries(groups).map(([d, es]) => `<div class="day-h"><span>${d === new Date().toDateString() ? 'Today' : new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span>${es.length}</span></div>
    <div class="list glass tl">${es.map(e => { const k = KIND[e.kind] || ['spark', e.kind]; const tm = new Date(e.t);
      return `<div class="tl-row"><div class="tl-ic">${icon(k[0])}</div><div class="grow"><b>${esc(e.title || k[1])}</b><small>${tm.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}${e.sub ? ' · ' + esc(e.sub) : ''}${e.loc ? ` · 📍 ${esc(e.loc.place)} <span class="tl-acc">±${e.loc.acc}m</span>` : ''}</small></div>${e.amt ? `<b class="num">${money(e.amt)}</b>` : ''}</div>`; }).join('')}</div>`).join('');
}

/* ================================================================== auto-confirm (payment notifications) */
let confirmHooks = {};
export function onAutoPaid(txId, fn) { confirmHooks[txId] = fn; return () => delete confirmHooks[txId]; }
function matchConfirm(it) {
  const am = +it.amount, t = +it.t || Date.now();
  const tx = store.data.tx.filter(x => (x.status === 'pending') && Math.abs((+x.am || 0) - am) < 0.01 && Math.abs(x.ts - t) < 45 * 60000).sort((a, b) => Math.abs(a.ts - t) - Math.abs(b.ts - t))[0];
  return tx;
}
export async function initAutoConfirm({ toast, onChange }) {
  const P = X(); if (!P) return;
  const handle = (items) => {
    let n = 0;
    (items || []).forEach(it => {
      if (it.src !== 'notif' || !store.s.autoNotif) return;
      const tx = matchConfirm(it); if (!tx) return;
      tx.status = 'paid'; tx.autoBy = it.src; n++;
      logEvent('auto', { title: `Auto-confirmed ${money(tx.am, { force: true })} to ${tx.pn || tx.pa}`, sub: it.src === 'sms' ? 'from bank SMS' : 'from payment notification', amt: tx.am, txId: tx.id });
      if (confirmHooks[tx.id]) { try { confirmHooks[tx.id](); } catch (e) {} }
      else toast(`Auto-confirmed ${money(tx.am, { force: true })} to ${esc(tx.pn || tx.pa)}`, 'check', 3000);
    });
    if (n) { store.save(); onChange && onChange(); }
  };
  try { handle((await P.takeConfirms()).items); } catch (e) {}
  try { P.addListener('confirm', it => { handle([it]); P.takeConfirms().catch(() => {}); }); } catch (e) {}
  return { pull: async () => { try { handle((await P.takeConfirms()).items); } catch (e) {} } };
}

/* ================================================================== reminders (bills, budget, weekly digest) */
// all scheduling now lives in notify.js (tone packs, nudges, quiet hours, custom reminders)
export async function scheduleReminders() { try { (await import('./notify.js')).reschedule(300); } catch (err) {} }

/* ================================================================== biometric unlock */
export async function biometricUnlock() {
  const P = X(); if (!P || !store.s.biometric) return false;
  try { const r = await P.biometric({ title: 'Unlock Vedverse' }); return !!(r && r.ok); } catch (e) { return false; }
}

/* ================================================================== permissions behind toggles */
export async function onToggle(k, v, { toast }) {
  const P = X();
  if (!v) return true;
  if (!P) { if (['locLog', 'biometric'].includes(k)) toast('Works in the Android app', 'info'); return true; }
  try {
    if (k === 'locLog') { const l = await getLoc(true); if (!l) { toast('Location permission is needed', 'alert'); return false; } toast(`📍 ${l.place} (±${l.acc} m)`, 'check'); }
    if (k === 'biometric') { const c = await P.canBiometric(); if (!c.ok) { toast('No fingerprint or face set up on this phone', 'alert'); return false; } const ok = await P.biometric({ title: 'Confirm to turn on' }); if (!ok.ok) return false; if (!store.s.pin) toast('Tip: also set a PIN as a backup', 'info'); }
    if (/^remind|budgetAlerts|weeklyDigest/.test(k)) { await P.notifyPermission(); scheduleReminders(); }
  } catch (e) { return false; }
  return true;
}

/* ================================================================== images (bundled art) */
const IMG = {};
function img(src) { return IMG[src] || (IMG[src] = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; })); }
const fontD = () => (getComputedStyle(document.documentElement).getPropertyValue('--font-d') || 'Sora, sans-serif').trim();

/* ================================================================== universe receipts — 22 styles */
export const RECEIPTS = [
  ['horizon', 'Event Horizon', 'poster', ['#f2a144', '#ffd29a']], ['nebula', 'Nebula', 'sky:0.25', ['#a9dcff', '#ffd29a']], ['milkyway', 'Milky Way', 'sky:0.62', ['#e8dcc6', '#9ab8ff']],
  ['aurora', 'Aurora', 'aurora', ['#5eead4', '#a78bfa']], ['supernova', 'Supernova', 'burst', ['#ffb36b', '#ff5a7a']], ['eclipse', 'Eclipse', 'eclipse', ['#ffe7c0', '#f2a144']],
  ['gold', 'Black Gold', 'solid:#0b0906', ['#e5c07b', '#fff3d6']], ['neon', 'Neon City', 'neon', ['#22d3ee', '#f472b6']], ['glacier', 'Glacier', 'grad:#03131f,#0b3a5a', ['#8be9ff', '#e0f2fe']],
  ['ember', 'Ember', 'grad:#120402,#4a1406', ['#ff7a1a', '#ffd0a1']], ['emerald', 'Emerald', 'grad:#010a06,#06301f', ['#34d399', '#a7f3d0']], ['violet', 'Violet Nebula', 'sky:0.9', ['#c4b5fd', '#f0abfc']],
  ['mono', 'Monochrome', 'solid:#050505', ['#ffffff', '#9a9a9a']], ['paper', 'Paper', 'paper', ['#1a1a1a', '#6b6b6b']], ['ticket', 'Space Ticket', 'ticket', ['#f2a144', '#a9dcff']],
  ['starmap', 'Star Map', 'starmap', ['#cfe0ff', '#f2a144']], ['quasar', 'Quasar', 'quasar', ['#a9c8ff', '#ffffff']], ['rose', 'Rose Gold', 'grad:#120809,#3a1e1f', ['#f4a6a0', '#fde2d6']],
  ['teal', 'Cosmic Teal', 'sky:0.4', ['#2dd4bf', '#99f6e4']], ['midnight', 'Midnight', 'grad:#01030a,#0b1430', ['#7aa2ff', '#dbe7ff']], ['galaxy', 'Spiral Galaxy', 'galaxy', ['#ffd9a8', '#a9dcff']],
  ['glass', 'Minimal Glass', 'glass', ['#ffffff', '#a9dcff']],
];
function stars(g, W, H, n, seed = 7) { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, z = r(); g.fillStyle = `rgba(255,${235 + z * 20 | 0},${220 + z * 35 | 0},${0.25 + z * 0.75})`; g.beginPath(); g.arc(x, y, z * z * 2.2 + 0.4, 0, 7); g.fill(); } }
async function paintBg(g, W, H, kind, pal) {
  const [k, arg] = kind.split(':');
  if (k === 'poster' || k === 'sky') {
    const im = await img(k === 'poster' ? 'assets/space/poster.jpg' : 'assets/space/sky-4k.webp');
    if (im) {
      if (k === 'poster') { const sc = Math.max(W / im.width, H / im.height); g.drawImage(im, (W - im.width * sc) / 2, 0, im.width * sc, im.height * sc); }
      else { const u = +arg; const sw = im.width * 0.16, sh = sw * H / W; g.drawImage(im, im.width * u - sw / 2, im.height * 0.5 - sh / 2, sw, sh, 0, 0, W, H); }
    }
    g.fillStyle = 'rgba(2,3,8,.25)'; g.fillRect(0, 0, W, H); return;
  }
  if (k === 'solid') { g.fillStyle = arg; g.fillRect(0, 0, W, H); stars(g, W, H, 140); return; }
  if (k === 'grad') { const [a, b] = arg.split(','); const gr = g.createLinearGradient(0, 0, W * 0.4, H); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, W, H); stars(g, W, H, 260); return; }
  if (k === 'paper') { g.fillStyle = '#f5f1e8'; g.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } return; }
  g.fillStyle = '#03040a'; g.fillRect(0, 0, W, H); stars(g, W, H, 380);
  const glow = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0')); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  if (k === 'aurora') { for (let i = 0; i < 5; i++) { g.strokeStyle = (i % 2 ? pal[1] : pal[0]) + '33'; g.lineWidth = 120 - i * 18; g.beginPath(); g.moveTo(-50, H * (0.25 + i * 0.04)); g.bezierCurveTo(W * 0.3, H * (0.05 + i * 0.05), W * 0.6, H * (0.45 - i * 0.03), W + 50, H * (0.2 + i * 0.05)); g.stroke(); } }
  if (k === 'burst') { glow(W / 2, H * 0.3, W * 0.9, pal[0], 0.55); for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, l = W * (0.2 + Math.random() * 0.7); g.strokeStyle = `rgba(255,220,180,${Math.random() * 0.25})`; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, H * 0.3); g.lineTo(W / 2 + Math.cos(a) * l, H * 0.3 + Math.sin(a) * l); g.stroke(); } glow(W / 2, H * 0.3, W * 0.25, '#ffffff', 0.7); }
  if (k === 'eclipse') { glow(W / 2, H * 0.28, W * 0.55, pal[1], 0.5); g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, H * 0.28, W * 0.2, 0, 7); g.fill(); g.strokeStyle = pal[0]; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H * 0.28, W * 0.2, 0, 7); g.stroke(); }
  if (k === 'neon') { g.strokeStyle = pal[0] + '55'; g.lineWidth = 2; for (let x = -W; x < W * 2; x += 70) { g.beginPath(); g.moveTo(x, H); g.lineTo(W / 2, H * 0.55); g.stroke(); } for (let y = H * 0.6; y < H; y += (y - H * 0.55) * 0.25 + 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } glow(W / 2, H * 0.55, W * 0.6, pal[1], 0.45); }
  if (k === 'ticket') { glow(W * 0.8, H * 0.1, W * 0.7, pal[0], 0.35); glow(W * 0.1, H * 0.95, W * 0.7, pal[1], 0.3); }
  if (k === 'starmap') { g.strokeStyle = pal[0] + '40'; g.lineWidth = 1.5; let px = W * 0.2, py = H * 0.2; for (let i = 0; i < 26; i++) { const nx = Math.random() * W, ny = Math.random() * H * 0.9; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(nx, ny, 3, 0, 7); g.fill(); px = nx; py = ny; } }
  if (k === 'quasar') { glow(W / 2, H * 0.3, W * 0.4, pal[0], 0.7); const gr = g.createLinearGradient(W / 2 - 18, 0, W / 2 + 18, 0); gr.addColorStop(0, 'rgba(160,200,255,0)'); gr.addColorStop(0.5, 'rgba(220,235,255,.85)'); gr.addColorStop(1, 'rgba(160,200,255,0)'); g.fillStyle = gr; g.fillRect(W / 2 - 18, 0, 36, H * 0.6); glow(W / 2, H * 0.3, W * 0.08, '#ffffff', 1); }
  if (k === 'galaxy') { g.save(); g.translate(W / 2, H * 0.3); for (let i = 0; i < 2600; i++) { const arm = i % 2, t = Math.random() * 4.2, r = 30 + t * 95 + Math.random() * 40, a = t * 1.25 + arm * Math.PI + Math.random() * 0.35; g.fillStyle = `rgba(255,${200 + Math.random() * 55 | 0},${170 + Math.random() * 80 | 0},${Math.random() * 0.6})`; g.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.45, 2.2, 2.2); } g.restore(); glow(W / 2, H * 0.3, W * 0.16, '#fff3dc', 0.9); }
  if (k === 'glass') { glow(W * 0.2, H * 0.15, W * 0.8, pal[1], 0.35); glow(W * 0.9, H * 0.8, W * 0.8, '#f2a144', 0.25); }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export async function renderReceipt(tx, styleId) {
  const st = RECEIPTS.find(r => r[0] === styleId) || RECEIPTS[0];
  const [, , bg, pal] = st, W = 1080, H = 1620, light = bg === 'paper';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  await paintBg(g, W, H, bg, pal);
  const fd = fontD();
  const tx0 = light ? '#161616' : '#ffffff', mu = light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.62)';
  // card
  const cx = 70, cy = 470, cw = W - 140, ch = 1010;
  g.save(); rr(g, cx, cy, cw, ch, 56);
  g.fillStyle = light ? 'rgba(255,255,255,.75)' : 'rgba(8,10,20,.62)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = light ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.16)'; g.stroke(); g.restore();
  if (bg === 'ticket') { g.fillStyle = '#03040a'; for (const yy of [cy + 330]) { g.beginPath(); g.arc(cx, yy, 30, 0, 7); g.arc(cx + cw, yy, 30, 0, 7); g.fill(); } g.setLineDash([14, 12]); g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(cx + 50, cy + 330); g.lineTo(cx + cw - 50, cy + 330); g.stroke(); g.setLineDash([]); }
  const label = { paid: 'Payment successful', pending: 'Payment pending', failed: 'Payment failed', cancelled: 'Payment cancelled' }[tx.status] || 'Payment';
  const okc = tx.status === 'paid' ? '#4ee3a0' : tx.status === 'pending' ? '#ffcc66' : '#ff6b81';
  // status badge
  g.fillStyle = okc; g.beginPath(); g.arc(W / 2, cy, 64, 0, 7); g.fill();
  g.strokeStyle = '#06130d'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
  if (tx.status === 'paid') { g.moveTo(W / 2 - 26, cy + 2); g.lineTo(W / 2 - 6, cy + 22); g.lineTo(W / 2 + 28, cy - 18); } else if (tx.status === 'pending') { g.moveTo(W / 2, cy - 26); g.lineTo(W / 2, cy + 4); g.lineTo(W / 2 + 18, cy + 16); } else { g.moveTo(W / 2 - 22, cy - 22); g.lineTo(W / 2 + 22, cy + 22); g.moveTo(W / 2 + 22, cy - 22); g.lineTo(W / 2 - 22, cy + 22); }
  g.stroke();
  g.textAlign = 'center'; g.fillStyle = okc; g.font = `700 40px ${fd}`; g.fillText(label, W / 2, cy + 130);
  // amount
  const amt = money(tx.am, { force: true, full: true });
  const grd = g.createLinearGradient(0, cy + 160, 0, cy + 300); grd.addColorStop(0, light ? '#111' : '#ffffff'); grd.addColorStop(1, pal[0]);
  g.fillStyle = grd; g.font = `800 ${amt.length > 9 ? 120 : 150}px ${fd}`; g.fillText(amt, W / 2, cy + 290);
  // details
  const d = new Date(tx.ts); const app = UPI.APPS.find(a => a.id === tx.app); const c = store.cat(tx.cat);
  const rows = [['To', tx.pn || tx.pa], ['UPI ID', tx.pa], ['When', d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })], ['Category', `${c.icon} ${c.name}`], tx.note ? ['Note', tx.note] : null, ['Paid via', app ? app.name : (tx.app || 'UPI')], tx.ref ? ['Reference', tx.ref] : null, tx.loc ? ['Where', tx.loc.place] : null].filter(Boolean);
  let y = cy + 400; g.textAlign = 'left';
  rows.slice(0, 7).forEach(([k, v]) => {
    g.fillStyle = mu; g.font = `500 32px ${fd}`; g.fillText(k, cx + 60, y);
    g.fillStyle = tx0; g.font = `600 34px ${fd}`; g.textAlign = 'right';
    let t = String(v); while (g.measureText(t).width > cw - 330 && t.length > 4) t = t.slice(0, -2); if (t !== String(v)) t += '…';
    g.fillText(t, cx + cw - 60, y); g.textAlign = 'left'; y += 78;
  });
  // footer
  g.textAlign = 'center'; g.fillStyle = mu; g.font = `600 30px ${fd}`; g.fillText('VEDVERSE', W / 2, H - 70);
  g.fillStyle = pal[0]; g.font = `500 26px ${fd}`; g.fillText(`${tx.id.slice(-10).toUpperCase()} · ${st[1]}`, W / 2, H - 30);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
export function openReceiptStyles(ctx, tx) {
  const { openSheet, haptic, onPick } = ctx;
  openSheet(`<h3>Receipt style</h3><p class="sub">${RECEIPTS.length} universe styles. Your pick is used for every receipt.</p><div class="rc-styles" id="rcs"></div>`, {
    tall: true,
    async onMount(el, close) {
      const box = $('#rcs', el);
      box.innerHTML = RECEIPTS.map(r => `<button class="rc-sty press ${store.s.receiptStyle === r[0] ? 'on' : ''}" data-rs="${r[0]}"><div class="rc-thumb" data-th="${r[0]}"></div><small>${esc(r[1])}</small></button>`).join('');
      for (const r of RECEIPTS) { const b = await renderReceipt(tx, r[0]); const u = URL.createObjectURL(b); const t = box.querySelector(`[data-th="${r[0]}"]`); if (t) t.style.backgroundImage = `url(${u})`; }
      box.onclick = e => { const b = e.target.closest('[data-rs]'); if (!b) return; store.s.receiptStyle = b.dataset.rs; store.save(); haptic('tick'); close(); onPick && onPick(); };
    },
  });
}

/* ================================================================== PDF statement (made on the phone) */
function pdfFromJpegs(pages) { // pages: [{bytes:Uint8Array,w,h}]
  const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length, obj = (i, body) => { offs[i] = len; push(`${i} 0 obj\n`); body(); push('\nendobj\n'); };
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, ct = pg + 1, im = pg + 2, cs = `q 595 0 0 842 0 0 cm /Im${i} Do Q`;
    obj(pg, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
    obj(ct, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); push(p.bytes); push('\nendstream'); });
  });
  const xref = len; const count = 3 + n * 3;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
export async function makeStatement(from, to) {
  const tx = store.data.tx.filter(t => t.ts >= from && t.ts <= to).sort((a, b) => a.ts - b.ts);
  const inc = (store.data.income || []).filter(t => t.ts >= from && t.ts <= to);
  const W = 1240, H = 1754, fd = fontD(), pages = [];
  const paid = tx.filter(t => t.status === 'paid'), spent = paid.reduce((a, t) => a + (+t.am || 0), 0), got = inc.reduce((a, t) => a + (+t.am || 0), 0);
  const byCat = {}; paid.forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) + (+t.am || 0); });
  const rowsPer = 30; const chunks = []; for (let i = 0; i < Math.max(1, tx.length); i += rowsPer) chunks.push(tx.slice(i, i + rowsPer));
  for (let p = 0; p < chunks.length; p++) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    const hd = g.createLinearGradient(0, 0, W, 0); hd.addColorStop(0, '#05070f'); hd.addColorStop(1, '#1a2240'); g.fillStyle = hd; g.fillRect(0, 0, W, p === 0 ? 300 : 140);
    g.fillStyle = '#f2a144'; g.font = `800 46px ${fd}`; g.fillText('Vedverse', 70, 84);
    g.fillStyle = '#dfe6ff'; g.font = `500 26px ${fd}`; g.fillText(`Statement · ${new Date(from).toLocaleDateString('en-IN')} – ${new Date(to).toLocaleDateString('en-IN')}`, 70, 124);
    g.textAlign = 'right'; g.fillText(`${store.s.name || ''} · page ${p + 1}/${chunks.length}`, W - 70, 84); g.textAlign = 'left';
    let y = 180;
    if (p === 0) {
      [['Spent', money(spent, { force: true, full: true })], ['Money in', money(got, { force: true, full: true })], ['Net', money(got - spent, { force: true, full: true })], ['Payments', String(paid.length)]].forEach(([k, v], i) => {
        g.fillStyle = '#9fb0d8'; g.font = `500 24px ${fd}`; g.fillText(k, 70 + i * 280, 200); g.fillStyle = '#ffffff'; g.font = `700 36px ${fd}`; g.fillText(v, 70 + i * 280, 248);
      });
      y = 360; g.fillStyle = '#111'; g.font = `700 30px ${fd}`; g.fillText('By category', 70, y); y += 20;
      const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6), mx = cats.length ? cats[0][1] : 1;
      cats.forEach(([k, v]) => { const c = store.cat(k); y += 46; g.fillStyle = '#333'; g.font = `500 24px ${fd}`; g.fillText(`${c.icon} ${c.name}`, 70, y); g.fillStyle = c.color; g.fillRect(330, y - 20, 620 * v / mx, 20); g.fillStyle = '#111'; g.textAlign = 'right'; g.fillText(money(v, { force: true, full: true }), W - 70, y); g.textAlign = 'left'; });
      y += 70;
    }
    g.fillStyle = '#f2f3f7'; g.fillRect(50, y - 34, W - 100, 50); g.fillStyle = '#555'; g.font = `600 22px ${fd}`;
    ['Date & time', 'Paid to', 'Category / note', 'Status', 'Amount'].forEach((h, i) => { g.textAlign = i === 4 ? 'right' : 'left'; g.fillText(h, i === 4 ? W - 70 : [70, 330, 640, 900][i], y); });
    g.textAlign = 'left'; y += 52;
    chunks[p].forEach((t, i) => {
      if (i % 2) { g.fillStyle = '#fafbfd'; g.fillRect(50, y - 32, W - 100, 44); }
      const c = store.cat(t.cat); const cut = (s, w) => { s = String(s || ''); g.font = `500 21px ${fd}`; while (g.measureText(s).width > w && s.length > 3) s = s.slice(0, -2); return s; };
      g.fillStyle = '#222'; g.font = `500 21px ${fd}`;
      g.fillText(new Date(t.ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), 70, y);
      g.fillText(cut(t.pn || t.pa, 290), 330, y); g.fillText(cut(t.note ? `${c.name} · ${t.note}` : c.name, 240), 640, y);
      g.fillStyle = t.status === 'paid' ? '#0a8f5a' : t.status === 'pending' ? '#b07800' : '#c0304a'; g.fillText(t.status, 900, y);
      g.fillStyle = '#111'; g.textAlign = 'right'; g.font = `700 22px ${fd}`; g.fillText(money(t.am, { force: true, full: true }), W - 70, y); g.textAlign = 'left';
      y += 44;
    });
    g.fillStyle = '#999'; g.font = `500 18px ${fd}`; g.fillText('Generated on this phone by Vedverse · payments happen in your UPI app', 70, H - 40);
    const url = cv.toDataURL('image/jpeg', 0.9); const bin = atob(url.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    pages.push({ bytes, w: W, h: H });
  }
  return pdfFromJpegs(pages);
}
export function openStatement(ctx) {
  const { openSheet, toast, haptic, saveBlob } = ctx;
  const now = new Date(), som = new Date(now.getFullYear(), now.getMonth(), 1);
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  openSheet(`<h3>PDF statement</h3><p class="sub">Made on your phone. Every payment, totals and categories.</p>
    <div class="chips-row" id="stQuick"><button class="chip on" data-q="month">This month</button><button class="chip" data-q="last">Last month</button><button class="chip" data-q="3m">3 months</button><button class="chip" data-q="year">This year</button><button class="chip" data-q="all">Everything</button></div>
    <div class="tool-row mt"><div class="form-row"><label>From</label><input class="field" type="date" id="stFrom" value="${iso(som)}"></div><div class="form-row"><label>To</label><input class="field" type="date" id="stTo" value="${iso(now)}"></div></div>
    <button class="btn primary full press mt" id="stGo">${icon('download')} Create PDF</button>`, {
    onMount(el, close) {
      $('#stQuick', el).onclick = e => {
        const b = e.target.closest('[data-q]'); if (!b) return; el.querySelectorAll('[data-q]').forEach(x => x.classList.toggle('on', x === b));
        const n = new Date(); let f = som, t = n;
        if (b.dataset.q === 'last') { f = new Date(n.getFullYear(), n.getMonth() - 1, 1); t = new Date(n.getFullYear(), n.getMonth(), 0); }
        if (b.dataset.q === '3m') f = new Date(n.getFullYear(), n.getMonth() - 2, 1);
        if (b.dataset.q === 'year') f = new Date(n.getFullYear(), 0, 1);
        if (b.dataset.q === 'all') f = new Date(Math.min(n.getTime(), ...store.data.tx.map(x => x.ts)));
        $('#stFrom', el).value = iso(f); $('#stTo', el).value = iso(t); haptic('tick');
      };
      $('#stGo', el).onclick = async () => {
        const f = new Date($('#stFrom', el).value + 'T00:00:00').getTime(), t = new Date($('#stTo', el).value + 'T23:59:59').getTime();
        $('#stGo', el).disabled = true; $('#stGo', el).textContent = 'Creating…';
        const blob = await makeStatement(f, t);
        logEvent('statement', { title: 'Made a PDF statement', sub: `${$('#stFrom', el).value} → ${$('#stTo', el).value}` });
        close(); haptic('success');
        await saveBlob(blob, `Vedverse-statement-${$('#stFrom', el).value}.pdf`, 'application/pdf');
      };
    },
  });
}

/* ================================================================== income */
export function monthIncome() { const n = new Date(), f = new Date(n.getFullYear(), n.getMonth(), 1).getTime(); return (store.data.income || []).filter(x => x.ts >= f).reduce((a, x) => a + (+x.am || 0), 0); }
export function openIncome(ctx) {
  const { openSheet, toast, haptic, onChange } = ctx;
  const list = () => (store.data.income || []).slice(0, 12).map(x => `<div class="bill"><div class="bill-ic" style="background:linear-gradient(135deg,#9ae6b4,#34d399)">₹</div><div class="bill-t"><b>${esc(x.src || 'Money in')}</b><small>${new Date(x.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${x.note ? ' · ' + esc(x.note) : ''}</small></div><b class="num" style="color:var(--good)">+${money(x.am)}</b><button class="icon-btn press" data-di="${x.id}">${icon('close')}</button></div>`).join('') || '<div class="w-empty">No money in yet this month.</div>';
  openSheet(`<h3>Money in</h3><p class="sub">Pocket money, salary, refunds… so “left this month” is real.</p>
    <div class="split-out glass"><div><small>This month</small><b class="num" id="inMonth">${money(monthIncome(), { force: true })}</b></div><div><small>Net (in − spent)</small><b class="num" id="inNet">${money(monthIncome() - stats().month, { force: true })}</b></div></div>
    <div class="bill-add glass"><b>Add money in</b>
      <div class="tool-row"><input class="field" id="inAm" inputmode="decimal" placeholder="Amount"><input class="field" id="inSrc" placeholder="From (Salary, Mom…)"></div>
      <input class="field" id="inNote" placeholder="Note (optional)">
      <div class="chips-row">${['Salary', 'Pocket money', 'Refund', 'Gift', 'Freelance', 'Cashback'].map(x => `<button class="chip" data-src="${x}">${x}</button>`).join('')}</div>
      <button class="btn primary full press" id="inAdd">${icon('plus')} Add</button></div>
    <div class="bills mt" id="inList">${list()}</div>`, {
    tall: true,
    onMount(el) {
      const repaint = () => { $('#inList', el).innerHTML = list(); $('#inMonth', el).textContent = money(monthIncome(), { force: true }); $('#inNet', el).textContent = money(monthIncome() - stats().month, { force: true }); };
      el.addEventListener('click', e => {
        const s = e.target.closest('[data-src]'); if (s) { $('#inSrc', el).value = s.dataset.src; haptic('tick'); }
        const d = e.target.closest('[data-di]'); if (d) { store.data.income = store.data.income.filter(x => x.id !== d.dataset.di); store.save(); repaint(); onChange && onChange(); }
      });
      $('#inAdd', el).onclick = () => {
        const am = +$('#inAm', el).value || 0; if (!(am > 0)) { toast('Enter an amount', 'alert'); return; }
        const x = { id: 'i' + Date.now().toString(36), ts: Date.now(), am, src: $('#inSrc', el).value.trim() || 'Money in', note: $('#inNote', el).value.trim() };
        store.data.income.unshift(x); store.save(); logEvent('income', { title: `Money in from ${x.src}`, amt: am });
        ['inAm', 'inSrc', 'inNote'].forEach(i => { $('#' + i, el).value = ''; }); haptic('success'); repaint(); onChange && onChange();
      };
    },
  });
}

/* ================================================================== theme builder */
export function openThemeBuilder(ctx) {
  const { openSheet, toast, haptic, THEMES, preview, apply, editId } = ctx;
  const base = (editId && store.s.customThemes[editId]) || { name: 'My theme', bg0: '#020307', bg1: '#0b1020', a1: '#f2a144', a2: '#a9dcff', a3: '#ffd29a', hot: '#fff3dc', temp: 6400, tint: '#ffffff', tintAmt: 0, yaw: 0, pitch: 0 };
  const t = { ...base };
  const col = (k, l) => `<label class="tb-col"><span>${l}</span><input type="color" data-c="${k}" value="${t[k]}"></label>`;
  openSheet(`<h3>${editId ? 'Edit theme' : 'Theme builder'}</h3><p class="sub">Your own disk colour, accents and sky. Changes preview live.</p>
    <div class="form-row"><label>Name</label><input class="field" id="tbName" value="${esc(t.name)}" maxlength="24"></div>
    <div class="form-row"><label>Colours</label><div class="tb-cols">${col('a1', 'Accent')}${col('a2', 'Glow')}${col('a3', 'Highlight')}${col('bg1', 'Background')}${col('tint', 'Disk tint')}</div></div>
    <div class="form-row"><label>Disk temperature · <span id="tbTv">${t.temp} K</span></label><input type="range" class="slider" min="3000" max="20000" step="100" value="${t.temp}" data-r="temp"></div>
    <div class="form-row"><label>Disk tint strength · <span id="tbAv">${Math.round(t.tintAmt * 100)}%</span></label><input type="range" class="slider" min="0" max="1" step="0.05" value="${t.tintAmt}" data-r="tintAmt"></div>
    <div class="form-row"><label>Sky region · <span id="tbYv">${t.yaw.toFixed(2)}</span></label><input type="range" class="slider" min="-3.14" max="3.14" step="0.05" value="${t.yaw}" data-r="yaw"></div>
    <div class="btn-row mt"><button class="btn primary press" id="tbSave">${icon('check')} Save & use</button>${editId ? `<button class="btn danger press" id="tbDel">${icon('trash')} Delete</button>` : ''}</div>`, {
    tall: true,
    onMount(el, close) {
      const live = () => { t.bg0 = t.bg0 || '#020307'; t.hot = t.hot || '#fff3dc'; preview({ ...t, tint: t.tintAmt > 0 ? t.tint : null }); };
      el.querySelectorAll('[data-c]').forEach(i => i.oninput = () => { t[i.dataset.c] = i.value; live(); });
      el.querySelectorAll('[data-r]').forEach(i => i.oninput = () => { t[i.dataset.r] = +i.value; $('#tbTv', el).textContent = t.temp + ' K'; $('#tbAv', el).textContent = Math.round(t.tintAmt * 100) + '%'; $('#tbYv', el).textContent = (+t.yaw).toFixed(2); live(); });
      $('#tbSave', el).onclick = () => {
        t.name = $('#tbName', el).value.trim() || 'My theme';
        const id = editId || ('c' + Date.now().toString(36));
        store.s.customThemes = { ...store.s.customThemes, [id]: { ...t, tint: t.tintAmt > 0 ? t.tint : undefined, custom: true } };
        store.s.theme = id; store.save(); apply(); haptic('success'); toast(`“${t.name}” saved`, 'check'); close();
      };
      const del = $('#tbDel', el); if (del) del.onclick = () => { const c = { ...store.s.customThemes }; delete c[editId]; store.s.customThemes = c; if (store.s.theme === editId) store.s.theme = 'nebula'; store.save(); apply(); close(); };
      live();
    },
    onClose() { apply(); },
  });
}

/* ================================================================== time of day */
export function todTheme(t) {
  const s = store.s; if (!s.timeOfDay) return t;
  const h = new Date().getHours(), slot = h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 16 ? 'day' : h >= 16 && h < 20 ? 'evening' : 'night';
  const c = (s.tod || {})[slot]; if (!c || c.toLowerCase() === '#ffffff') return t;
  return { ...t, tint: c, tintAmt: Math.max(t.tintAmt || 0, +s.todStrength || 0.45) };
}
export function openTodEditor(ctx) {
  const { openSheet, haptic, apply } = ctx;
  const s = store.s; const tod = { ...s.tod };
  const L = { morning: 'Morning · 5–10', day: 'Day · 10–16', evening: 'Evening · 16–20', night: 'Night · 20–5' };
  openSheet(`<h3>Time of day</h3><p class="sub">The disk light shifts with the hour. White = no change.</p>
    <div class="tb-cols">${Object.keys(L).map(k => `<label class="tb-col"><span>${L[k]}</span><input type="color" data-t="${k}" value="${tod[k] || '#ffffff'}"></label>`).join('')}</div>
    <div class="form-row mt"><label>Strength · <span id="tdS">${Math.round((s.todStrength || .45) * 100)}%</span></label><input type="range" class="slider" min="0.1" max="1" step="0.05" value="${s.todStrength || .45}" id="tdR"></div>
    <button class="btn primary full press mt" id="tdOk">${icon('check')} Save</button>`, {
    onMount(el, close) {
      el.querySelectorAll('[data-t]').forEach(i => i.oninput = () => { tod[i.dataset.t] = i.value; });
      $('#tdR', el).oninput = e => { $('#tdS', el).textContent = Math.round(e.target.value * 100) + '%'; };
      $('#tdOk', el).onclick = () => { s.tod = tod; s.todStrength = +$('#tdR', el).value; s.timeOfDay = true; store.save(); apply(); haptic('success'); close(); };
    },
  });
}

/* ================================================================== dock editor */
export const DOCK_OPTS = { home: ['Home', 'home', 'go'], history: ['History', 'history', 'go'], stats: ['Insights', 'stats', 'go'], settings: ['Settings', 'settings', 'go'], receive: ['Receive', 'download', 'act'], split: ['Split', 'user', 'act'], bills: ['Bills', 'calendar', 'act'], studio: ['Widgets', 'grid', 'act'], income: ['Money in', 'wallet', 'act'], statement: ['Statement', 'download', 'act'], identity: ['Icon', 'spark', 'act'] };
export function openDockEditor(ctx) {
  const { openSheet, haptic, apply, toast } = ctx;
  let dock = store.s.dock.slice(0, 4);
  const paint = el => {
    $('#dkNow', el).innerHTML = dock.map((k, i) => `<button class="chip on" data-slot="${i}">${i + 1}. ${DOCK_OPTS[k][0]}</button>`).join('');
    $('#dkAll', el).innerHTML = Object.entries(DOCK_OPTS).map(([k, v]) => `<button class="chip ${dock.includes(k) ? 'dim' : ''}" data-opt="${k}">${icon(v[1])} ${v[0]}</button>`).join('');
  };
  let slot = 0;
  openSheet(`<h3>Dock</h3><p class="sub">Tap a slot, then pick what goes there. The scan button always stays in the middle; Settings must stay somewhere.</p>
    <div class="chips-row" id="dkNow"></div><div class="id-names mt" id="dkAll"></div>
    <div class="btn-row mt"><button class="btn press" id="dkReset">Reset</button><button class="btn primary press" id="dkSave">${icon('check')} Save</button></div>`, {
    onMount(el, close) {
      paint(el); el.querySelector('[data-slot="0"]').classList.add('sel');
      el.addEventListener('click', e => {
        const s = e.target.closest('[data-slot]'), o = e.target.closest('[data-opt]');
        if (s) { slot = +s.dataset.slot; el.querySelectorAll('[data-slot]').forEach(x => x.classList.toggle('sel', x === s)); haptic('tick'); }
        if (o) { const k = o.dataset.opt; const j = dock.indexOf(k); if (j >= 0) dock[j] = dock[slot]; dock[slot] = k; haptic('tick'); paint(el); el.querySelector(`[data-slot="${slot}"]`).classList.add('sel'); }
      });
      $('#dkReset', el).onclick = () => { dock = ['home', 'history', 'stats', 'settings']; paint(el); };
      $('#dkSave', el).onclick = () => { if (!dock.includes('settings')) { toast('Keep Settings in the dock', 'alert'); return; } store.s.dock = dock; store.save(); apply(); haptic('success'); close(); };
    },
  });
}

/* ================================================================== languages (offline dictionary) */
const LANGS = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી', bn: 'বাংলা', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ' };
export const LANG_NAMES = LANGS;
const ORDER = ['hi', 'mr', 'gu', 'bn', 'ta', 'te', 'kn', 'ml', 'pa'];
const D = {
  'Home': ['होम', 'होम', 'હોમ', 'হোম', 'முகப்பு', 'హోమ్', 'ಮುಖಪುಟ', 'ഹോം', 'ਹੋਮ'],
  'History': ['इतिहास', 'इतिहास', 'ઇતિહાસ', 'ইতিহাস', 'வரலாறு', 'చరిత్ర', 'ಇತಿಹಾಸ', 'ചരിത്രം', 'ਇਤਿਹਾਸ'],
  'Insights': ['जानकारी', 'माहिती', 'માહિતી', 'তথ্য', 'நுண்ணறிவு', 'విశ్లేషణ', 'ಒಳನೋಟ', 'വിശകലനം', 'ਜਾਣਕਾਰੀ'],
  'Settings': ['सेटिंग्स', 'सेटिंग्ज', 'સેટિંગ્સ', 'সেটিংস', 'அமைப்புகள்', 'సెట్టింగ్‌లు', 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', 'ക്രമീകരണങ്ങൾ', 'ਸੈਟਿੰਗਾਂ'],
  'Spent this month': ['इस महीने खर्च', 'या महिन्यातील खर्च', 'આ મહિને ખર્ચ', 'এই মাসের খরচ', 'இந்த மாத செலவு', 'ఈ నెల ఖర్చు', 'ಈ ತಿಂಗಳ ಖರ್ಚು', 'ഈ മാസത്തെ ചെലവ്', 'ਇਸ ਮਹੀਨੇ ਖਰਚ'],
  'Your widgets': ['आपके विजेट', 'तुमचे विजेट', 'તમારા વિજેટ', 'আপনার উইজেট', 'உங்கள் விட்ஜெட்கள்', 'మీ విడ్జెట్‌లు', 'ನಿಮ್ಮ ವಿಜೆಟ್‌ಗಳು', 'നിങ്ങളുടെ വിജറ്റുകൾ', 'ਤੁਹਾਡੇ ਵਿਜੇਟ'],
  'Add': ['जोड़ें', 'जोडा', 'ઉમેરો', 'যোগ করুন', 'சேர்', 'జోడించు', 'ಸೇರಿಸಿ', 'ചേർക്കുക', 'ਜੋੜੋ'],
  'Paying': ['भुगतान', 'पेमेंट', 'ચુકવણી', 'পেমেন্ট', 'செலுத்துகிறது', 'చెల్లింపు', 'ಪಾವತಿ', 'പണമടയ്ക്കുന്നു', 'ਭੁਗਤਾਨ'],
  'Gallery': ['गैलरी', 'गॅलरी', 'ગેલેરી', 'গ্যালারি', 'கேலரி', 'గ్యాలరీ', 'ಗ್ಯಾಲರಿ', 'ഗാലറി', 'ਗੈਲਰੀ'],
  'Paste': ['पेस्ट', 'पेस्ट', 'પેસ્ટ', 'পেস্ট', 'ஒட்டு', 'పేస్ట్', 'ಅಂಟಿಸಿ', 'ഒട്ടിക്കുക', 'ਪੇਸਟ'],
  'Budget': ['बजट', 'बजेट', 'બજેટ', 'বাজেট', 'பட்ஜெட்', 'బడ్జెట్', 'ಬಜೆಟ್', 'ബജറ്റ്', 'ਬਜਟ'],
  'Today': ['आज', 'आज', 'આજે', 'আজ', 'இன்று', 'ఈరోజు', 'ಇಂದು', 'ഇന്ന്', 'ਅੱਜ'],
  'Last 7 days': ['पिछले 7 दिन', 'मागील 7 दिवस', 'છેલ્લા 7 દિવસ', 'গত ৭ দিন', 'கடந்த 7 நாட்கள்', 'గత 7 రోజులు', 'ಕಳೆದ 7 ದಿನ', 'കഴിഞ്ഞ 7 ദിവസം', 'ਪਿਛਲੇ 7 ਦਿਨ'],
  'Last payment': ['पिछला भुगतान', 'मागील पेमेंट', 'છેલ્લી ચુકવણી', 'শেষ পেমেন্ট', 'கடைசி கட்டணம்', 'చివరి చెల్లింపు', 'ಕೊನೆಯ ಪಾವತಿ', 'അവസാന പേയ്‌മെന്റ്', 'ਆਖਰੀ ਭੁਗਤਾਨ'],
  'Categories': ['श्रेणियाँ', 'श्रेणी', 'શ્રેણીઓ', 'বিভাগ', 'வகைகள்', 'వర్గాలు', 'ವರ್ಗಗಳು', 'വിഭാഗങ്ങൾ', 'ਸ਼੍ਰੇਣੀਆਂ'],
  'Favourites': ['पसंदीदा', 'आवडते', 'મનપસંદ', 'প্রিয়', 'பிடித்தவை', 'ఇష్టమైనవి', 'ಮೆಚ್ಚಿನವು', 'പ്രിയപ്പെട്ടവ', 'ਮਨਪਸੰਦ'],
  'Receive': ['पैसे लें', 'पैसे घ्या', 'મેળવો', 'গ্রহণ', 'பெறு', 'స్వీకరించు', 'ಸ್ವೀಕರಿಸಿ', 'സ്വീകരിക്കുക', 'ਪ੍ਰਾਪਤ ਕਰੋ'],
  'Split bill': ['बिल बाँटें', 'बिल वाटा', 'બિલ વહેંચો', 'বিল ভাগ', 'பில் பிரி', 'బిల్ పంచు', 'ಬಿಲ್ ಹಂಚಿ', 'ബിൽ പങ്കിടുക', 'ਬਿੱਲ ਵੰਡੋ'],
  'Bills & reminders': ['बिल और रिमाइंडर', 'बिले आणि स्मरणपत्रे', 'બિલ અને રિમાઇન્ડર', 'বিল ও রিমাইন্ডার', 'பில்கள் & நினைவூட்டல்', 'బిల్లులు & రిమైండర్లు', 'ಬಿಲ್ & ಜ್ಞಾಪನೆ', 'ബില്ലുകളും ഓർമ്മപ്പെടുത്തലും', 'ਬਿੱਲ ਅਤੇ ਯਾਦ'],
  'All': ['सभी', 'सर्व', 'બધા', 'সব', 'அனைத்தும்', 'అన్నీ', 'ಎಲ್ಲಾ', 'എല്ലാം', 'ਸਾਰੇ'],
  'Paid': ['भुगतान हुआ', 'भरले', 'ચૂકવ્યું', 'পরিশোধিত', 'செலுத்தப்பட்டது', 'చెల్లించారు', 'ಪಾವತಿಸಲಾಗಿದೆ', 'അടച്ചു', 'ਭੁਗਤਾਨ ਹੋਇਆ'],
  'Pending': ['लंबित', 'प्रलंबित', 'બાકી', 'অপেক্ষমাণ', 'நிலுவையில்', 'పెండింగ్', 'ಬಾಕಿ', 'തീർപ്പാക്കാത്തത്', 'ਬਕਾਇਆ'],
  'Failed': ['विफल', 'अयशस्वी', 'નિષ્ફળ', 'ব্যর্থ', 'தோல்வி', 'విఫలమైంది', 'ವಿಫಲ', 'പരാജയപ്പെട്ടു', 'ਅਸਫਲ'],
  'Save': ['सेव करें', 'जतन करा', 'સાચવો', 'সংরক্ষণ', 'சேமி', 'సేవ్', 'ಉಳಿಸಿ', 'സേവ് ചെയ്യുക', 'ਸੇਵ ਕਰੋ'],
  'Cancel': ['रद्द करें', 'रद्द करा', 'રદ કરો', 'বাতিল', 'ரத்து', 'రద్దు', 'ರದ್ದು', 'റദ്ദാക്കുക', 'ਰੱਦ ਕਰੋ'],
  'Pay with': ['इससे भुगतान करें', 'याने पेमेंट करा', 'આનાથી ચૂકવો', 'এটি দিয়ে পেমেন্ট', 'இதன் மூலம் செலுத்து', 'దీనితో చెల్లించు', 'ಇದರ ಮೂಲಕ ಪಾವತಿ', 'ഇതുവഴി അടയ്ക്കുക', 'ਇਸ ਨਾਲ ਭੁਗਤਾਨ'],
  'Any UPI app': ['कोई भी UPI ऐप', 'कोणतेही UPI ॲप', 'કોઈપણ UPI એપ', 'যেকোনো UPI অ্যাপ', 'எந்த UPI ஆப்பும்', 'ఏదైనా UPI యాప్', 'ಯಾವುದೇ UPI ಆಪ್', 'ഏത് UPI ആപ്പും', 'ਕੋਈ ਵੀ UPI ਐਪ'],
  'Receive money': ['पैसे प्राप्त करें', 'पैसे मिळवा', 'પૈસા મેળવો', 'টাকা গ্রহণ', 'பணம் பெறு', 'డబ్బు స్వీకరించు', 'ಹಣ ಸ್ವೀಕರಿಸಿ', 'പണം സ്വീകരിക്കുക', 'ਪੈਸੇ ਪ੍ਰਾਪਤ ਕਰੋ'],
  'Split a bill': ['बिल बाँटें', 'बिल वाटा', 'બિલ વહેંચો', 'বিল ভাগ করুন', 'பில்லைப் பிரி', 'బిల్ పంచుకోండి', 'ಬಿಲ್ ಹಂಚಿಕೊಳ್ಳಿ', 'ബിൽ പങ്കിടുക', 'ਬਿੱਲ ਵੰਡੋ'],
  'Appearance': ['रूप', 'स्वरूप', 'દેખાવ', 'চেহারা', 'தோற்றம்', 'రూపం', 'ಗೋಚರತೆ', 'രൂപം', 'ਦਿੱਖ'],
  'Universe': ['ब्रह्मांड', 'विश्व', 'બ્રહ્માંડ', 'মহাবিশ্ব', 'பிரபஞ்சம்', 'విశ్వం', 'ವಿಶ್ವ', 'പ്രപഞ്ചം', 'ਬ੍ਰਹਿਮੰਡ'],
  'Payments': ['भुगतान', 'पेमेंट्स', 'ચુકવણીઓ', 'পেমেন্ট', 'கட்டணங்கள்', 'చెల్లింపులు', 'ಪಾವತಿಗಳು', 'പേയ്‌മെന്റുകൾ', 'ਭੁਗਤਾਨ'],
  'Scanner': ['स्कैनर', 'स्कॅनर', 'સ્કેનર', 'স্ক্যানার', 'ஸ்கேனர்', 'స్కానర్', 'ಸ್ಕ್ಯಾನರ್', 'സ്കാനർ', 'ਸਕੈਨਰ'],
  'Security': ['सुरक्षा', 'सुरक्षा', 'સુરક્ષા', 'নিরাপত্তা', 'பாதுகாப்பு', 'భద్రత', 'ಭದ್ರತೆ', 'സുരക്ഷ', 'ਸੁਰੱਖਿਆ'],
  'Notifications': ['सूचनाएँ', 'सूचना', 'સૂચનાઓ', 'বিজ্ঞপ্তি', 'அறிவிப்புகள்', 'నోటిఫికేషన్లు', 'ಅಧಿಸೂಚನೆಗಳು', 'അറിയിപ്പുകൾ', 'ਸੂਚਨਾਵਾਂ'],
  'Language & format': ['भाषा और प्रारूप', 'भाषा आणि स्वरूप', 'ભાષા અને ફોર્મેટ', 'ভাষা ও ফরম্যাট', 'மொழி & வடிவம்', 'భాష & ఫార్మాట్', 'ಭಾಷೆ & ಸ್ವರೂಪ', 'ഭാഷയും ഫോർമാറ്റും', 'ਭਾਸ਼ਾ ਅਤੇ ਫਾਰਮੈਟ'],
  'Home & widgets': ['होम और विजेट', 'होम आणि विजेट', 'હોમ અને વિજેટ', 'হোম ও উইজেট', 'முகப்பு & விட்ஜெட்', 'హోమ్ & విడ్జెట్లు', 'ಮುಖಪುಟ & ವಿಜೆಟ್', 'ഹോം & വിജറ്റ്', 'ਹੋਮ ਅਤੇ ਵਿਜੇਟ'],
  'History & data': ['इतिहास और डेटा', 'इतिहास आणि डेटा', 'ઇતિહાસ અને ડેટા', 'ইতিহাস ও ডেটা', 'வரலாறு & தரவு', 'చరిత్ర & డేటా', 'ಇತಿಹಾಸ & ಡೇಟಾ', 'ചരിത്രവും ഡാറ്റയും', 'ਇਤਿਹਾਸ ਅਤੇ ਡਾਟਾ'],
  'Sound & touch': ['ध्वनि और स्पर्श', 'आवाज आणि स्पर्श', 'અવાજ અને સ્પર્શ', 'শব্দ ও স্পর্শ', 'ஒலி & தொடுதல்', 'ధ్వని & స్పర్శ', 'ಧ್ವನಿ & ಸ್ಪರ್ಶ', 'ശബ്ദവും സ്പർശവും', 'ਆਵਾਜ਼ ਅਤੇ ਛੋਹ'],
  'Budget & goals': ['बजट और लक्ष्य', 'बजेट आणि उद्दिष्टे', 'બજેટ અને લક્ષ્ય', 'বাজেট ও লক্ষ্য', 'பட்ஜெட் & இலக்குகள்', 'బడ్జెట్ & లక్ష్యాలు', 'ಬಜೆಟ್ & ಗುರಿಗಳು', 'ബജറ്റും ലക്ഷ്യങ്ങളും', 'ਬਜਟ ਅਤੇ ਟੀਚੇ'],
  'Features': ['सुविधाएँ', 'वैशिष्ट्ये', 'સુવિધાઓ', 'ফিচার', 'அம்சங்கள்', 'ఫీచర్లు', 'ವೈಶಿಷ್ಟ್ಯಗಳು', 'സവിശേഷതകൾ', 'ਫੀਚਰ'],
  'Timeline': ['समयरेखा', 'टाइमलाइन', 'ટાઇમલાઇન', 'টাইমলাইন', 'காலவரிசை', 'టైమ్‌లైన్', 'ಟೈಮ್‌ಲೈನ್', 'ടൈംലൈൻ', 'ਟਾਈਮਲਾਈਨ'],
  'Money in': ['आमदनी', 'उत्पन्न', 'આવક', 'আয়', 'வரவு', 'ఆదాయం', 'ಆದಾಯ', 'വരവ്', 'ਆਮਦਨ'],
  'Payment successful': ['भुगतान सफल', 'पेमेंट यशस्वी', 'ચુકવણી સફળ', 'পেমেন্ট সফল', 'கட்டணம் வெற்றி', 'చెల్లింపు విజయవంతం', 'ಪಾವತಿ ಯಶಸ್ವಿ', 'പേയ്‌മെന്റ് വിജയിച്ചു', 'ਭੁਗਤਾਨ ਸਫਲ'],
  'Did it go through?': ['क्या भुगतान हुआ?', 'पेमेंट झाले का?', 'ચુકવણી થઈ?', 'পেমেন্ট হয়েছে?', 'கட்டணம் சென்றதா?', 'చెల్లింపు జరిగిందా?', 'ಪಾವತಿ ಆಯಿತೇ?', 'പണം പോയോ?', 'ਕੀ ਭੁਗਤਾਨ ਹੋਇਆ?'],
  'List': ['सूची', 'यादी', 'યાદી', 'তালিকা', 'பட்டியல்', 'జాబితా', 'ಪಟ್ಟಿ', 'ലിസ്റ്റ്', 'ਸੂਚੀ'],
  'Your sky': ['आपका आकाश', 'तुमचे आकाश', 'તમારું આકાશ', 'আপনার আকাশ', 'உங்கள் வானம்', 'మీ ఆకాశం', 'ನಿಮ್ಮ ಆಕಾಶ', 'നിങ്ങളുടെ ആകാശം', 'ਤੁਹਾਡਾ ਅਸਮਾਨ'],
};
const PH = { 'Search settings': ['सेटिंग्स खोजें', 'सेटिंग्ज शोधा', 'સેટિંગ્સ શોધો', 'সেটিংস খুঁজুন', 'அமைப்புகளைத் தேடு', 'సెట్టింగ్‌లు వెతకండి', 'ಸೆಟ್ಟಿಂಗ್ ಹುಡುಕಿ', 'ക്രമീകരണങ്ങൾ തിരയുക', 'ਸੈਟਿੰਗਾਂ ਖੋਜੋ'], 'Add a note (optional)': ['नोट जोड़ें (वैकल्पिक)', 'टीप जोडा (ऐच्छिक)', 'નોંધ ઉમેરો (વૈકલ્પિક)', 'নোট যোগ করুন (ঐচ্ছিক)', 'குறிப்பு (விருப்பம்)', 'నోట్ జోడించండి (ఐచ్ఛికం)', 'ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)', 'കുറിപ്പ് (ഐച്ഛികം)', 'ਨੋਟ ਜੋੜੋ (ਵਿਕਲਪਿਕ)'] };
let obs = null, cur = 'en';
function tr(text) {
  const i = ORDER.indexOf(cur); if (i < 0) return null;
  const k = text.trim(); const row = D[k]; return row ? text.replace(k, row[i]) : null;
}
function walk(root) {
  if (cur === 'en') return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = tw.nextNode())) { if (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(n.parentElement.tagName)) continue; const t = tr(n.nodeValue); if (t && t !== n.nodeValue) n.nodeValue = t; }
  (root.querySelectorAll ? root.querySelectorAll('[placeholder]') : []).forEach(e => { const row = PH[e.getAttribute('placeholder')]; if (row) e.setAttribute('placeholder', row[ORDER.indexOf(cur)]); });
}
export function setLanguage(lang) {
  cur = lang || 'en';
  document.documentElement.lang = cur;
  if (obs) { obs.disconnect(); obs = null; }
  if (cur === 'en') return;
  walk(document.body);
  obs = new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(nd => { if (nd.nodeType === 1) walk(nd); else if (nd.nodeType === 3) { const t = tr(nd.nodeValue); if (t) nd.nodeValue = t; } }); });
  obs.observe(document.body, { childList: true, subtree: true });
}

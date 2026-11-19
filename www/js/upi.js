// Vedverse — Smart UPI engine
// Fixes the classic "amount shows 50.00 but GPay refuses to pay" problem:
//  1. Never tamper with signed / amount-locked merchant QRs (GPay rejects modified signatures).
//  2. Never percent-encode '@' in the VPA and never use '+' for spaces (several apps choke).
//  3. Strip emoji / special chars from the note (tn) – a common silent failure.
//  4. P2P links stay minimal (pa, pn, am, cu, tn) – no fake tr / mc that trigger risk checks.
//  5. If the app still declines, an automatic retry ladder: original QR → no amount (amount copied).
import { store } from './store.js';

export const APPS = [
  { id: 'gpay', name: 'Google Pay', pkg: 'com.google.android.apps.nbu.paisa.user', ios: 'gpay://upi/', color: '#4285F4', glyph: 'G' },
  { id: 'phonepe', name: 'PhonePe', pkg: 'com.phonepe.app', ios: 'phonepe://', color: '#5f259f', glyph: 'पे' },
  { id: 'paytm', name: 'Paytm', pkg: 'net.one97.paytm', ios: 'paytmmp://', color: '#00baf2', glyph: 'P' },
  { id: 'bhim', name: 'BHIM', pkg: 'in.org.npci.upiapp', ios: 'bhim://', color: '#00a651', glyph: 'B' },
  { id: 'cred', name: 'CRED', pkg: 'com.dreamplug.androidapp', ios: 'credpay://upi/', color: '#1c1c1c', glyph: 'C' },
  { id: 'amazon', name: 'Amazon Pay', pkg: 'in.amazon.mShop.android.shopping', ios: '', color: '#ff9900', glyph: 'a' },
  { id: 'navi', name: 'Navi', pkg: 'com.naviapp', ios: '', color: '#22c55e', glyph: 'N' },
  { id: 'supermoney', name: 'super.money', pkg: 'money.super.payments', ios: '', color: '#7c3aed', glyph: 'S' },
  { id: 'mobikwik', name: 'MobiKwik', pkg: 'com.mobikwik_new', ios: '', color: '#2563eb', glyph: 'M' },
  { id: 'whatsapp', name: 'WhatsApp', pkg: 'com.whatsapp', ios: '', color: '#25d366', glyph: 'W' },
  { id: 'kotak', name: 'Kotak', pkg: 'com.msf.kbank.mobile', ios: '', color: '#ed1c24', glyph: 'K' },
  { id: 'chooser', name: 'Any UPI app', pkg: '', ios: 'upi://', color: '#8b5cf6', glyph: '∞' },
];

export const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export const platform = () => (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios-web' : 'web');
let UpiNative = null;
export function upiPlugin() {
  if (!isNative() || platform() !== 'android') return null;
  if (!UpiNative) UpiNative = window.Capacitor.registerPlugin('VedUpi');
  return UpiNative;
}

/* ---------------- Parsing ---------------- */
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;

function parseQuery(q) {
  const out = []; // keep order + raw
  q.replace(/^\?/, '').split('&').forEach(kv => {
    if (!kv) return;
    const i = kv.indexOf('=');
    const k = (i < 0 ? kv : kv.slice(0, i)).trim();
    const raw = i < 0 ? '' : kv.slice(i + 1);
    let val = raw;
    try { val = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) {}
    out.push({ k, kl: k.toLowerCase(), raw, val });
  });
  return out;
}

// EMV / Bharat QR (starts with 000201) — tag-length-value
function parseEMV(s) {
  const tlv = (str) => { const o = {}; let i = 0; while (i + 4 <= str.length) { const t = str.substr(i, 2), l = parseInt(str.substr(i + 2, 2), 10); if (isNaN(l)) break; o[t] = str.substr(i + 4, l); i += 4 + l; } return o; };
  const top = tlv(s);
  let pa = '';
  for (let t = 26; t <= 51; t++) {
    const v = top[String(t)]; if (!v) continue;
    const sub = tlv(v);
    for (const k in sub) if (VPA_RE.test(sub[k])) { pa = sub[k]; break; }
    if (pa) break;
  }
  if (!pa) return null;
  return { pa, pn: top['59'] || '', am: top['54'] || '', mc: top['52'] || '', city: top['60'] || '', emv: true };
}

export function parseQR(text) {
  if (!text) return null;
  const t = String(text).trim();
  // upi://pay?...  (also UPI://PAY, upi:/pay, intent:// variants, https links carrying pa=)
  let m = t.match(/^(?:upi|UPI):\/{0,2}([a-zA-Z]+)\?(.*)$/s);
  let query = null, verb = 'pay';
  if (m) { verb = m[1].toLowerCase(); query = m[2]; }
  else if (/[?&]pa=/i.test(t)) { query = t.slice(t.indexOf('?') + 1).split('#')[0]; }
  if (query !== null) {
    if (verb === 'mandate') return { type: 'unsupported', raw: t, reason: 'This is a UPI AutoPay mandate QR — open it directly in your UPI app.' };
    const params = parseQuery(query);
    const get = k => (params.find(p => p.kl === k) || {}).val || '';
    const pa = get('pa').trim();
    if (!pa) return { type: 'text', raw: t };
    const info = {
      type: 'upi', raw: t, params, pa, pn: get('pn'), am: get('am'), tn: get('tn'), mc: get('mc'), tr: get('tr'),
      cu: get('cu') || 'INR', mam: get('mam'), sign: get('sign'), mode: get('mode'), orgid: get('orgid'),
    };
    info.signed = !!info.sign;
    info.merchant = !!((info.mc && info.mc !== '0000') || info.tr || info.signed || info.orgid);
    info.lockedAmount = !!(info.am && +info.am > 0);
    return info;
  }
  if (/^000201/.test(t)) {
    const e = parseEMV(t);
    if (e) return { type: 'upi', raw: t, params: [], pa: e.pa, pn: e.pn, am: e.am, tn: '', mc: e.mc, tr: '', cu: 'INR', emv: true, merchant: true, signed: false, lockedAmount: !!(e.am && +e.am > 0) };
  }
  if (VPA_RE.test(t)) return { type: 'upi', raw: t, params: [], pa: t, pn: '', am: '', tn: '', mc: '', tr: '', cu: 'INR', merchant: false, signed: false, lockedAmount: false, manual: true };
  return { type: 'text', raw: t };
}

/* ---------------- Building ---------------- */
const enc = v => encodeURIComponent(String(v)).replace(/%40/gi, '@');
export function cleanNote(n) { return String(n || '').replace(/[^\w .,\-\/]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50); }
export function fmtAmount(a) {
  const n = Math.round((+a || 0) * 100) / 100;
  if (store.s.amountFormat === 'plain' && n % 1 === 0) return String(n);
  return n.toFixed(2);
}

function buildFromParams(params, overrides = {}, drop = []) {
  const seen = new Set();
  const parts = [];
  params.forEach(p => {
    if (drop.includes(p.kl)) return;
    seen.add(p.kl);
    if (overrides[p.kl] !== undefined) { if (overrides[p.kl] !== null) parts.push(p.kl + '=' + enc(overrides[p.kl])); }
    else parts.push(p.kl + '=' + p.raw); // untouched raw value
  });
  Object.entries(overrides).forEach(([k, v]) => { if (!seen.has(k) && v !== null && v !== '' && v !== undefined) parts.push(k + '=' + enc(v)); });
  return 'upi://pay?' + parts.join('&');
}

// Apps known to refuse pre-filled amounts to personal UPI IDs when opened from another app (their fraud rule, not a bug).
// Vedverse also learns this per app: one decline and it stops pre-filling for that app.
const STRICT_P2P = new Set(['com.google.android.apps.nbu.paisa.user', 'in.org.npci.upiapp']);
export function blocksPrefill(app) { const k = app && (app.pkg || app.id); if (!k) return false; const L = store.data.noPrefill || {}; return L[k] === undefined ? STRICT_P2P.has(k) : !!L[k]; }
export function learnPrefill(app, ok) { const k = app && (app.pkg || app.id); if (!k) return; (store.data.noPrefill = store.data.noPrefill || {})[k] = !ok; store.save(); }

/** Returns an ordered list of link attempts: [{uri, label, why}] */
export function buildAttempts(info, amount, note, app) {
  if (!Array.isArray(info.params)) info = { ...info, params: [] };
  const s = store.s;
  const am = fmtAmount(amount);
  const tn = s.noteToApp ? cleanNote(note) : '';
  const p2p = () => {
    const ov = { pa: info.pa, pn: info.pn || info.pa.split('@')[0], am, cu: 'INR' };
    if (tn) ov.tn = tn;
    return 'upi://pay?' + Object.entries(ov).map(([k, v]) => k + '=' + enc(v)).join('&');
  };
  const noAmount = () => {
    const ov = { pa: info.pa, pn: info.pn || info.pa.split('@')[0], cu: 'INR' };
    if (tn) ov.tn = tn;
    return 'upi://pay?' + Object.entries(ov).map(([k, v]) => k + '=' + enc(v)).join('&');
  };
  const original = () => {
    if (!info.params.length) return noAmount();
    // keep every value byte-for-byte; only normalise scheme + key case (some QRs print UPI://PAY?PA=...)
    if (/^upi:\/\/pay\?/.test(info.raw) && info.params.every(p => p.k === p.kl)) return info.raw;
    return 'upi://pay?' + info.params.map(p => p.kl + '=' + p.raw).join('&');
  };
  const merchantWithAmount = () => buildFromParams(info.params, { am, cu: info.cu || 'INR', ...(tn && !info.tn ? { tn } : {}) });

  let list = [];
  const mode = s.payMode;
  if (mode === 'original') list = [{ uri: original(), label: 'Original QR', why: 'Opening the QR exactly as scanned.' }];
  else if (mode === 'noamount') list = [{ uri: noAmount(), label: 'Enter amount in app', why: 'Amount copied — paste it in the app.' }];
  else if (mode === 'always') list = [{ uri: info.params.length && info.merchant ? merchantWithAmount() : p2p(), label: 'With amount', why: '' }];
  else {
    // smart
    if (info.signed || info.lockedAmount) list.push({ uri: original(), label: 'Secure merchant QR', why: 'This QR is signed / amount-locked, so it is sent untouched.' });
    else if (info.merchant && info.params.length) list.push({ uri: merchantWithAmount(), label: 'Merchant + amount', why: '' });
    else if (blocksPrefill(app)) list.push({ uri: noAmount(), label: 'Type amount in app', why: (app && app.name || 'This app') + ' doesn’t accept pre-filled amounts to personal UPI IDs from other apps. The amount is copied: paste or type it there.', copy: am, typed: true });
    else list.push({ uri: p2p(), label: 'Direct UPI', why: '', prefill: true });
  }
  // retry ladder
  list.push({ uri: original(), label: 'Original QR', why: 'Opens the QR exactly as printed — no changes at all.' });
  list.push({ uri: noAmount(), label: 'Type amount in app', why: 'Some apps block pre-filled amounts to personal UPI IDs. The amount is copied so you can paste it.', copy: am, typed: true });
  if (!info.merchant && !info.signed && !info.lockedAmount) list.push({ uri: p2p(), label: 'Pre-filled amount', why: 'Sends the amount straight to the app.', prefill: true });
  const seen = new Set();
  return list.filter(a => (seen.has(a.uri) ? false : (seen.add(a.uri), true)));
}

/* ---------------- Launching ---------------- */
export function parseResponse(str) {
  if (!str) return { status: 'unknown' };
  const o = {};
  String(str).split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1)); });
  const st = (o.status || '').toLowerCase();
  let status = 'unknown';
  if (st.startsWith('succ') || o.responsecode === '00' || o.responsecode === '0') status = 'paid';
  else if (st.startsWith('fail')) status = 'failed';
  else if (st.startsWith('sub') || st.startsWith('pend')) status = 'pending';
  return { status, ref: o.approvalrefno || o.txnref || o.txnid || '', txnId: o.txnid || '', raw: str };
}

export async function installedApps() {
  const P = upiPlugin();
  if (P) {
    try { const r = await P.getApps(); return (r.apps || []).map(a => ({ ...(APPS.find(x => x.pkg === a.pkg) || { id: a.pkg, name: a.name, color: '#8b5cf6', glyph: a.name[0] }), name: a.name, pkg: a.pkg, icon: a.icon })); } catch (e) { console.warn(e); }
  }
  return APPS;
}

export async function launch(uri, app) {
  const P = upiPlugin();
  if (P) {
    try {
      const outside = !!(window.__vvPayOutside && window.__vvPayOutside());
      const r = await P.pay({ uri, pkg: app && app.pkg ? app.pkg : '', outside });
      if (r && r.outside) {
        // separate app: wait until the user comes back to Vedverse, then ask how it went
        await new Promise(res => {
          let left = document.hidden;
          const vis = () => { if (document.hidden) left = true; else if (left) { document.removeEventListener('visibilitychange', vis); res(); } };
          document.addEventListener('visibilitychange', vis);
          setTimeout(() => { if (!left) { document.removeEventListener('visibilitychange', vis); res(); } }, 4000);
        });
        return { status: 'manual' };
      }
      return parseResponse(r && r.response);
    } catch (e) {
      return { status: 'error', error: String(e && e.message || e) };
    }
  }
  // iOS / web: app-specific scheme or generic upi://
  let url = uri;
  if (app && app.ios && /iphone|ipad|ipod/i.test(navigator.userAgent)) url = uri.replace('upi://', app.ios);
  return new Promise(resolve => {
    let left = false;
    const vis = () => { if (document.hidden) left = true; else if (left) { cleanup(); resolve({ status: 'manual' }); } };
    const cleanup = () => document.removeEventListener('visibilitychange', vis);
    document.addEventListener('visibilitychange', vis);
    window.location.href = url;
    setTimeout(() => { if (!left) { cleanup(); resolve({ status: 'noapp' }); } }, 2600);
  });
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (er) {} ta.remove(); return true;
  }
}

export async function pushWidgetData(payload) {
  const P = upiPlugin();
  if (P) { try { await P.setWidgetData({ json: JSON.stringify(payload) }); } catch (e) {} }
}

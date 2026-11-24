// Vedverse — Budget tracker extras: quick expenses (one tap), recurring expenses, spending calendar, month compare.
import { store, stats, money, paid, sum, DAY } from './store.js';
import { icon } from './icons.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, el = document) => el.querySelector(s);
const MF = v => money(v, { force: true });

/* ================================================================== quick expenses (one tap = logged) */
const DEF_QUICK = [
  { id: 'q1', emoji: '☕', label: 'Chai', am: 20, cat: 'food', method: 'cash' },
  { id: 'q2', emoji: '🍱', label: 'Lunch', am: 100, cat: 'food', method: 'upi' },
  { id: 'q3', emoji: '🛺', label: 'Auto', am: 50, cat: 'travel', method: 'cash' },
  { id: 'q4', emoji: '🖨️', label: 'Print', am: 20, cat: 'study', method: 'cash' },
  { id: 'q5', emoji: '🍫', label: 'Snack', am: 30, cat: 'food', method: 'cash' },
];
export const quickList = () => (store.data.quickExp = store.data.quickExp || DEF_QUICK.map(q => ({ ...q })));
let lastQuick = null;
export function quickAdd(id, ctx) {
  const q = quickList().find(x => x.id === id); if (!q) return;
  const tx = store.addTx({ pa: '', pn: q.label, am: +q.am, cat: q.cat, status: 'paid', app: q.method || 'cash', manual: true, quick: true });
  lastQuick = { id: tx.id, t: Date.now() };
  ctx.haptic && ctx.haptic('success');
  ctx.toast && ctx.toast(`${q.emoji} ${esc(q.label)} ${MF(q.am)} added`, 'check', 2000);
  ctx.onChange && ctx.onChange();
  return tx;
}
export function undoQuick(ctx) {
  if (!lastQuick || Date.now() - lastQuick.t > 60000) { ctx.toast && ctx.toast('Nothing to undo', 'info'); return; }
  store.deleteTx(lastQuick.id); lastQuick = null; ctx.toast && ctx.toast('Removed', 'check', 1400); ctx.onChange && ctx.onChange();
}
export const hasUndo = () => !!(lastQuick && Date.now() - lastQuick.t < 60000);

function rowsEditor(ctx, { key, title, sub, list, blank, row, read, save, addLabel, max = 12 }) {
  const { openSheet, toast, haptic, onChange } = ctx;
  openSheet(`<h3>${title}</h3><p class="sub">${sub}</p>
    <div id="rxList">${list.map(row).join('')}</div>
    <button class="btn press mt" id="rxAdd" style="width:100%">${icon('plus')} ${addLabel}</button>
    <button class="btn primary press mt" id="rxSave" style="width:100%">${icon('check')} Save</button>`, {
    key, tall: true,
    onMount(el, close) {
      el.addEventListener('click', e => { const d = e.target.closest('[data-rxdel]'); if (d) { d.closest('.bt-qrow').remove(); haptic('tick'); } });
      $('#rxAdd', el).onclick = () => { if (el.querySelectorAll('.bt-qrow').length >= max) { toast(`Up to ${max}`, 'info'); return; } $('#rxList', el).insertAdjacentHTML('beforeend', row(blank())); };
      $('#rxSave', el).onclick = () => {
        save([...el.querySelectorAll('.bt-qrow')].map(r => read(r, f => r.querySelector(`[data-f="${f}"]`).value)));
        store.save(); haptic('success'); close(); toast('Saved', 'check', 1200); onChange && onChange();
      };
    },
  });
}
const catSelect = (cur) => `<select class="field bt-qc" data-f="cat">${store.data.categories.map(c => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select>`;

export function openQuickEditor(ctx) {
  rowsEditor(ctx, {
    key: 'bt-quick', title: 'Quick expenses', sub: 'One tap on Home logs these instantly. Emoji · name · amount · category.', addLabel: 'Add quick expense',
    list: quickList(),
    blank: () => ({ id: 'q' + Date.now().toString(36), emoji: '✨', label: '', am: '', cat: store.data.categories[0].id }),
    row: q => `<div class="bt-qrow" data-id="${q.id}"><input class="field bt-qe" value="${esc(q.emoji)}" maxlength="4" data-f="emoji"><input class="field" value="${esc(q.label)}" maxlength="20" data-f="label" placeholder="Name"><input class="field bt-qa" type="number" inputmode="decimal" value="${q.am}" data-f="am" placeholder="₹">${catSelect(q.cat)}<button class="icon-btn press" data-rxdel aria-label="Delete">${icon('trash')}</button></div>`,
    read: (r, g) => ({ id: r.dataset.id, emoji: g('emoji') || '✨', label: g('label').trim(), am: +g('am') || 0, cat: g('cat'), method: 'cash' }),
    save: L => { store.data.quickExp = L.filter(q => q.label && q.am > 0); },
  });
}

/* ================================================================== recurring expenses (rent, recharge, subscriptions) */
export const recurringList = () => (store.data.recurring = store.data.recurring || []);
// logs every recurring expense whose day has come this month and isn't logged yet
export function applyRecurring() {
  const now = new Date(), ym = now.getFullYear() * 100 + now.getMonth(); let n = 0;
  recurringList().forEach(r => {
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), day = Math.min(+r.day || 1, dim);
    if (r.on === false || r.lastYm === ym || now.getDate() < day) return;
    store.addTx({ pa: '', pn: r.label, am: +r.am, cat: r.cat, status: 'paid', app: r.method || 'upi', manual: true, recurring: r.id, ts: new Date(now.getFullYear(), now.getMonth(), day, 10).getTime() });
    r.lastYm = ym; n++;
  });
  if (n) store.save();
  return n;
}
export function openRecurring(ctx) {
  const old = Object.fromEntries(recurringList().map(r => [r.id, r]));
  rowsEditor(ctx, {
    key: 'bt-rec', title: 'Recurring expenses', sub: 'Logged automatically every month on their day. Name · amount · day · category.', addLabel: 'Add recurring', max: 20,
    list: recurringList(),
    blank: () => ({ id: 'r' + Date.now().toString(36), label: '', am: '', day: new Date().getDate(), cat: 'bills' }),
    row: r => `<div class="bt-qrow" data-id="${r.id}"><input class="field" value="${esc(r.label)}" maxlength="24" data-f="label" placeholder="Rent, recharge…"><input class="field bt-qa" type="number" inputmode="decimal" value="${r.am}" data-f="am" placeholder="₹"><input class="field bt-qd" type="number" min="1" max="31" value="${r.day || 1}" data-f="day" title="Day of month">${catSelect(r.cat)}<button class="icon-btn press" data-rxdel aria-label="Delete">${icon('trash')}</button></div>`,
    read: (r, g) => ({ id: r.dataset.id, label: g('label').trim(), am: +g('am') || 0, day: Math.max(1, Math.min(31, +g('day') || 1)), cat: g('cat'), method: 'upi', lastYm: (old[r.dataset.id] || {}).lastYm, on: true, isNew: !old[r.dataset.id] }),
    save: L => {
      const now = new Date(), ym = now.getFullYear() * 100 + now.getMonth();
      // a brand-new item whose day already passed this month starts next month (no surprise back-logging)
      store.data.recurring = L.filter(r => r.label && r.am > 0).map(({ isNew, ...r }) => { if (isNew && now.getDate() >= r.day) r.lastYm = ym; return r; });
    },
  });
}

/* ================================================================== spending calendar + month compare */
export function calendarHTML() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), dim = new Date(y, m + 1, 0).getDate();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;   // Monday first
  const days = Array(dim).fill(0);
  paid({ range: 'month' }).forEach(t => { days[new Date(t.ts).getDate() - 1] += +t.am || 0; });
  const db = +store.s.dailyBudget || 0, mx = Math.max(1, ...days);
  const cells = Array(first).fill('<i class="bt-d empty"></i>').concat(days.map((v, i) => {
    const lvl = v ? Math.min(4, Math.ceil(v / mx * 4)) : 0, over = db && v > db, today = i + 1 === now.getDate();
    return `<i class="bt-d l${lvl}${over ? ' over' : ''}${today ? ' today' : ''}${i + 1 > now.getDate() ? ' future' : ''}"><span>${i + 1}</span></i>`;
  }));
  const noSpend = days.slice(0, now.getDate()).filter(v => !v).length;
  return `<div class="bt-cal-h">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span>${d}</span>`).join('')}</div><div class="bt-cal">${cells.join('')}</div>
    <div class="bt-week-f"><span>No-spend days <b class="num">${noSpend}</b></span><span>Over daily plan <b class="num">${db ? days.filter(v => v > db).length : 0}</b></span></div>`;
}
export function lastMonthCompare() {
  const n = new Date(), mStart = new Date(n.getFullYear(), n.getMonth(), 1).getTime(), from = new Date(n.getFullYear(), n.getMonth() - 1, 1).getTime();
  const to = Math.min(from + n.getDate() * DAY, mStart);   // the same number of days last month
  const prev = sum(store.data.tx.filter(t => t.status === 'paid' && t.ts >= from && t.ts < to));
  if (!prev) return '';
  const d = (stats().month - prev) / prev;
  return `<span class="bt-cmp ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))}% vs same days last month</span>`;
}

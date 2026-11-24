// Vedverse — Budget tracker mode: a home built for tracking every rupee (cash, UPI, card), category budgets,
// month overview, savings, bills and quick insights. Same data as Scanner mode; flip between them in Settings.
import { store, stats, money, daily, paid, sum, compact, DAY, startOfDay } from './store.js';
import { icon } from './icons.js';
import { ring, bars } from './widgets.js';
import { greeting, monthIncome } from './extras.js';
import { dueList } from './tools.js';
import { quickList, hasUndo, recurringList, calendarHTML, lastMonthCompare } from './budgetx.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, el = document) => el.querySelector(s);
const M = v => money(v);
const MF = v => money(v, { force: true });

export const METHODS = { cash: ['💵', 'Cash'], upi: ['⚡', 'UPI'], card: ['💳', 'Card'], other: ['🪙', 'Other'] };
export const isBudget = () => store.s.appMode === 'budget';
const catBudgets = () => (store.data.catBudgets = store.data.catBudgets || {});

/* ================================================================== mode picker (top of Settings) */
export function modePickerHTML() {
  const b = isBudget();
  return `<div class="mode-pick">
    <button class="mode-tile glass press ${!b ? 'on' : ''}" data-act="mode-scanner"><span class="mode-ic">${icon('scan')}</span><b>Scanner</b><small>Scan &amp; pay first</small></button>
    <button class="mode-tile glass press ${b ? 'on' : ''}" data-act="mode-budget"><span class="mode-ic">${icon('wallet')}</span><b>Budget tracker</b><small>Track every rupee</small></button>
  </div>`;
}

/* ================================================================== home (budget mode) */
export function budgetHomeHTML(txRow, widgetsHTML = '') {
  const s = stats(), st = store.s;
  const budget = +st.monthlyBudget || 0;
  const left = Math.max(0, budget - s.month);
  const pct = budget ? s.month / budget : 0;
  const pillCls = pct > 1 ? 'bad' : pct > 0.8 ? 'warn' : '';
  const inc = monthIncome();
  const now = new Date(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthTx = paid({ range: 'month' });
  const avgDay = s.month / Math.max(1, now.getDate());
  const biggest = monthTx.reduce((a, t) => (+t.am > (+a?.am || 0) ? t : a), null);
  const topCat = Object.entries(s.byCat).sort((a, b) => b[1] - a[1])[0];

  // category budgets: every category with a limit or spending this month
  const CB = catBudgets();
  const cats = store.data.categories.map(c => ({ c, spent: s.byCat[c.id] || 0, lim: +CB[c.id] || 0 })).filter(x => x.spent || x.lim)
    .sort((a, b) => (b.lim ? b.spent / b.lim : 0) - (a.lim ? a.spent / a.lim : 0) || b.spent - a.spent);
  const catHTML = cats.length ? cats.map(({ c, spent, lim }) => {
    const p = lim ? spent / lim : 0, cls = p > 1 ? 'bad' : p > 0.8 ? 'warn' : '';
    return `<div class="bt-cat ${cls}"><span class="bt-cat-ic" style="--c:${c.color}">${c.icon}</span><div class="grow"><div class="bt-cat-top"><b>${esc(c.name)}</b><span class="num">${M(spent)}${lim ? `<small> / ${compact(lim)}</small>` : ''}</span></div>
      <div class="bt-bar"><i style="width:${lim ? Math.min(100, p * 100) : 100}%;--c:${lim ? '' : c.color}" class="${lim ? '' : 'nolim'}"></i></div>
      <small class="bt-cat-sub">${lim ? (p > 1 ? `${MF(spent - lim)} over` : `${MF(lim - spent)} left`) : 'No limit set'}</small></div></div>`;
  }).join('') : `<div class="empty" style="padding:18px 8px">No spending yet this month.<br><small class="muted">Add an expense and it lands here.</small></div>`;

  const wk = daily(7);
  const recent = store.data.tx.filter(t => t.status === 'paid').slice(0, 6);
  const due = dueList().filter(b => !b.paid).slice(0, 3);
  const goal = +st.goalAmount || 0, saved = +st.goalSaved || 0;

  return `
    <div class="hero bt-hero" id="hero">
      ${greeting() ? `<div class="hero-greet">${greeting()}</div>` : ''}<div class="hero-kicker">${budget ? 'Left to spend this month' : 'Spent this month'}</div>
      <div class="hero-amt num">${budget ? M(left) : M(s.month)}${budget ? `<small>of ${compact(budget)}</small>` : ''}</div>
      <div class="hero-pills">
        <span class="pill glass ${pillCls}"><span class="dot"></span>${M(Math.floor(s.allowance))}/day safe</span>
        <span class="pill glass">${icon('bolt')} ${M(s.today)} today</span>
        <span class="pill glass">${icon('calendar')} ${dim - now.getDate() + 1} days left</span>
      </div>
    </div>

    <div class="bt-quick">
      <button class="bt-q primary press" data-act="bt-add">${icon('plus')}<span>Expense</span></button>
      <button class="bt-q glass press" data-act="bt-income">${icon('download')}<span>Income</span></button>
      <button class="bt-q glass press" data-act="scan">${icon('scan')}<span>Scan &amp; pay</span></button>
    </div>
    <div class="bt-qk">${quickList().map(q => `<button class="bt-qchip glass press" data-act="bt-q:${q.id}"><span>${esc(q.emoji)}</span><b>${esc(q.label)}</b><small class="num">${MF(q.am)}</small></button>`).join('')}${hasUndo() ? `<button class="bt-qchip glass press undo" data-act="bt-undo">${icon('refresh')}<b>Undo</b></button>` : ''}<button class="bt-qchip glass press" data-act="bt-qedit">${icon('edit')}<b>Edit</b></button></div>

    <div class="bt-over glass">
      <div class="bt-ring">${ring(Math.min(1, pct), 92, 9, pct > 1 ? 'var(--bad)' : pct > 0.8 ? 'var(--warn)' : 'var(--a2)', 'rgba(255,255,255,.08)', 'btr')}<div class="bt-ring-t"><b class="num">${Math.round(pct * 100)}%</b><small>used</small></div></div>
      <div class="bt-over-rows">
        <div><small>Spent</small><b class="num">${M(s.month)}</b></div>
        <div><small>Money in</small><b class="num good">${M(inc)}</b></div>
        <div><small>Net</small><b class="num ${inc - s.month < 0 ? 'bad' : 'good'}">${money(inc - s.month)}</b></div>
        <div><small>Month forecast</small><b class="num ${budget && s.forecast > budget ? 'bad' : ''}">${M(Math.round(s.forecast))}</b></div>
        ${lastMonthCompare() ? `<div style="grid-column:1/-1">${lastMonthCompare()}</div>` : ''}
      </div>
    </div>

    <div class="section-h"><h3>Category budgets</h3><button data-act="bt-cats">${icon('edit')} Set limits</button></div>
    <div class="bt-cats glass">${catHTML}</div>

    <div class="section-h"><h3>Last 7 days</h3><button data-act="go:stats">${icon('stats')} Insights</button></div>
    <div class="bt-week glass">${bars(wk.map(d => d.v), 86, wk.map(d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.ts).getDay()]))}<div class="bt-week-f"><span>Avg/day <b class="num">${M(Math.round(avgDay))}</b></span><span>Week <b class="num">${M(s.week)}</b></span></div></div>

    <div class="section-h"><h3>Spending calendar</h3><button data-act="go:history">${icon('calendar')} Days</button></div>
    <div class="bt-week glass">${calendarHTML()}</div>

    <div class="section-h"><h3>Recurring</h3><button data-act="bt-rec">${icon('edit')} Manage</button></div>
    ${recurringList().length ? `<div class="list glass">${recurringList().map(r => { const c = store.cat(r.cat); const ym = new Date().getFullYear() * 100 + new Date().getMonth(); return `<div class="tx" data-act="bt-rec"><div class="av" style="--c:${c.color}">${c.icon}</div><div class="grow"><b>${esc(r.label)}</b><small>Every month on day ${r.day} · ${r.lastYm === ym ? 'logged this month ✓' : 'auto-logs on its day'}</small></div><div class="amt"><b class="num">${M(r.am)}</b></div></div>`; }).join('')}</div>`
      : `<button class="bt-empty glass press" data-act="bt-rec">${icon('plus')} Add rent, recharge, subscriptions… they log themselves every month</button>`}

    <div class="bt-tiles">
      <div class="bt-tile glass"><small>Top category</small><b>${topCat ? `${store.cat(topCat[0]).icon} ${esc(store.cat(topCat[0]).name)}` : '—'}</b><span class="num">${topCat ? M(topCat[1]) : ''}</span></div>
      <div class="bt-tile glass"><small>Biggest expense</small><b>${biggest ? esc(biggest.pn || biggest.pa || 'Payment') : '—'}</b><span class="num">${biggest ? M(biggest.am) : ''}</span></div>
      <div class="bt-tile glass"><small>Payments</small><b class="num">${s.monthCount}</b><span>this month</span></div>
      <div class="bt-tile glass"><small>Pending</small><b class="num">${s.pending}</b><span>${s.pending ? 'to confirm' : 'all clear'}</span></div>
    </div>

    ${goal ? `<div class="section-h"><h3>Savings goal</h3><button data-act="bt-save">${icon('plus')} Add</button></div>
    <div class="bt-goal glass"><div class="bt-goal-top"><b>🎯 ${esc(st.goalName || 'Goal')}</b><span class="num">${MF(saved)} <small>of ${compact(goal)}</small></span></div><div class="bt-bar big"><i style="width:${Math.min(100, saved / goal * 100)}%"></i></div><small>${saved >= goal ? 'Goal reached! 🎉' : `${MF(goal - saved)} to go`}</small></div>` : ''}

    ${due.length ? `<div class="section-h"><h3>Upcoming bills</h3><button data-act="bills">${icon('calendar')} Manage</button></div>
    <div class="list glass">${due.map(b => `<div class="tx" data-act="bills"><div class="av" style="--c:#7cf0c5">🧾</div><div class="grow"><b>${esc(b.name)}</b><small>${b.inDays < 0 ? `overdue ${-b.inDays}d` : b.inDays === 0 ? 'due today' : `due in ${b.inDays}d`}</small></div><div class="amt"><b class="num">${M(b.am)}</b></div></div>`).join('')}</div>` : ''}

    <div class="section-h"><h3>Recent</h3><button data-act="go:history">${icon('history')} All</button></div>
    <div class="list glass">${recent.length ? recent.map((t, i) => txRow(t, i)).join('') : `<div class="empty" style="padding:18px 8px">Nothing yet. Tap <b>Expense</b> to add your first one.</div>`}</div>
    ${widgetsHTML}
  `;
}

/* ================================================================== add expense / income */
export function openAddExpense(ctx, preset = {}) {
  const { openSheet, toast, haptic, onChange } = ctx;
  const cats = store.data.categories;
  let cat = preset.cat || store.s.lastManualCat || cats[0].id, method = store.s.lastMethod || 'cash';
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  openSheet(`<h3>Add expense</h3>
    <div class="bt-amt glass"><span>${esc(store.s.currency)}</span><input id="btAmt" inputmode="decimal" placeholder="0" autocomplete="off"></div>
    <input class="field mt" id="btNote" placeholder="What was it? (lunch, auto, recharge…)" maxlength="60" autocomplete="off">
    <div class="form-row mt"><label>Category</label></div>
    <div class="w-chips bt-chips">${cats.map(c => `<button class="chip ${c.id === cat ? 'on' : ''}" data-btc="${c.id}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>
    <div class="form-row mt"><label>Paid by</label></div>
    <div class="w-chips bt-chips">${Object.entries(METHODS).map(([k, [e, l]]) => `<button class="chip ${k === method ? 'on' : ''}" data-btm="${k}">${e} ${l}</button>`).join('')}</div>
    <div class="form-row mt"><label>Date</label><input class="field" type="date" id="btDate" value="${today}" max="${today}" style="flex:0 0 170px"></div>
    <button class="btn primary press mt" id="btSave" style="width:100%">${icon('check')} Save expense</button>`, {
    key: 'bt-add',
    onMount(el, close) {
      const amt = $('#btAmt', el);
      setTimeout(() => amt.focus(), 250);
      el.addEventListener('click', e => {
        const c = e.target.closest('[data-btc]'); if (c) { cat = c.dataset.btc; el.querySelectorAll('[data-btc]').forEach(x => x.classList.toggle('on', x === c)); haptic('tick'); return; }
        const m = e.target.closest('[data-btm]'); if (m) { method = m.dataset.btm; el.querySelectorAll('[data-btm]').forEach(x => x.classList.toggle('on', x === m)); haptic('tick'); }
      });
      const save = () => {
        let v = String(amt.value).replace(/[^\d.+]/g, '');
        if (v.includes('+')) v = v.split('+').reduce((a, x) => a + (+x || 0), 0);
        const am = Math.round((+v || 0) * 100) / 100;
        if (!(am > 0)) { toast('Enter an amount', 'info'); amt.focus(); return; }
        const d = $('#btDate', el).value, note = $('#btNote', el).value.trim();
        const ts = d && d !== today ? new Date(d + 'T12:00:00').getTime() : Date.now();
        const c = store.cat(cat);
        store.addTx({ pa: '', pn: note || c.name, am, note: note ? '' : '', cat, status: 'paid', app: method, ts, manual: true });
        store.s.lastManualCat = cat; store.s.lastMethod = method; store.save();
        haptic('success'); close(); toast(`Added ${MF(am)} · ${c.icon} ${esc(c.name)}`, 'check', 2000);
        onChange && onChange();
      };
      $('#btSave', el).onclick = save;
      amt.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    },
  });
}

/* ================================================================== category limits */
export function openCatBudgets(ctx) {
  const { openSheet, toast, haptic, onChange } = ctx;
  const CB = catBudgets(), s = stats();
  const total = () => Object.values(CB).reduce((a, v) => a + (+v || 0), 0);
  openSheet(`<h3>Category budgets</h3><p class="sub">A monthly limit for each category. Leave empty for no limit.</p>
    <div class="list glass bt-lim">${store.data.categories.map(c => `<div class="bt-lim-row"><span class="bt-cat-ic" style="--c:${c.color}">${c.icon}</span><div class="grow"><b>${esc(c.name)}</b><small>${MF(s.byCat[c.id] || 0)} spent this month</small></div><input class="field sm" type="number" inputmode="numeric" min="0" placeholder="No limit" data-cb="${c.id}" value="${CB[c.id] || ''}"></div>`).join('')}</div>
    <p class="sub mt" id="btLimTot"></p>
    <button class="btn primary press mt" id="btLimSave" style="width:100%">${icon('check')} Save limits</button>`, {
    key: 'bt-cats', tall: true,
    onMount(el, close) {
      const tot = () => { const t = [...el.querySelectorAll('[data-cb]')].reduce((a, i) => a + (+i.value || 0), 0); $('#btLimTot', el).innerHTML = t ? `Limits add up to <b>${MF(t)}</b>${store.s.monthlyBudget ? ` · monthly budget ${MF(store.s.monthlyBudget)}${t > store.s.monthlyBudget ? ' <span style="color:var(--warn)">(over)</span>' : ''}` : ''}` : ''; };
      el.addEventListener('input', tot); tot();
      $('#btLimSave', el).onclick = () => {
        el.querySelectorAll('[data-cb]').forEach(i => { const v = Math.max(0, Math.round(+i.value || 0)); if (v) CB[i.dataset.cb] = v; else delete CB[i.dataset.cb]; });
        store.save(); haptic('success'); close(); toast('Limits saved', 'check', 1400); onChange && onChange();
      };
    },
  });
}

/* ================================================================== add to savings */
export function openAddSavings(ctx) {
  const { openSheet, toast, haptic, onChange } = ctx;
  openSheet(`<h3>Add to savings</h3><p class="sub">${esc(store.s.goalName || 'Your goal')}: ${MF(store.s.goalSaved || 0)} of ${MF(store.s.goalAmount || 0)}</p>
    <div class="bt-amt glass"><span>${esc(store.s.currency)}</span><input id="svAmt" inputmode="decimal" placeholder="0"></div>
    <button class="btn primary press mt" id="svOk" style="width:100%">${icon('check')} Add</button>`, {
    key: 'bt-save',
    onMount(el, close) {
      const i = $('#svAmt', el); setTimeout(() => i.focus(), 250);
      $('#svOk', el).onclick = () => { const v = +i.value || 0; if (!(v > 0)) { toast('Enter an amount', 'info'); return; } store.s.goalSaved = (+store.s.goalSaved || 0) + v; store.save(); haptic('success'); close(); toast(`Saved ${MF(v)} 🎯`, 'check'); onChange && onChange(); };
    },
  });
}

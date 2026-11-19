// Vedverse — money tools: Receive money (your own UPI QR), Split a bill, Bills & reminders.
import { store, money } from './store.js';
import * as UPI from './upi.js';
import { icon } from './icons.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, el = document) => el.querySelector(s);
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,64}$/;

export function myLink(amount, note) {
  const s = store.s; if (!s.myVpa) return '';
  const q = [`pa=${encodeURIComponent(s.myVpa)}`, `pn=${encodeURIComponent(s.name || 'Vedverse user')}`];
  if (amount > 0) q.push(`am=${(+amount).toFixed(2)}`);
  if (note) q.push(`tn=${encodeURIComponent(note)}`);
  q.push('cu=INR');
  return 'upi://pay?' + q.join('&');
}

async function shareText(text, title) {
  try { const SH = window.Capacitor && window.Capacitor.registerPlugin('Share'); if (SH) { await SH.share({ title, text }); return true; } } catch (e) { if (/cancel/i.test(String(e))) return true; }
  try { if (navigator.share) { await navigator.share({ title, text }); return true; } } catch (e) { if (e.name === 'AbortError') return true; }
  await UPI.copyText(text); return false;
}
async function sharePng(b64, name, title, text) {
  try {
    const FS = window.Capacitor.registerPlugin('Filesystem'), SH = window.Capacitor.registerPlugin('Share');
    const w = await FS.writeFile({ path: name, data: b64, directory: 'CACHE' });
    await SH.share({ title, text, files: [w.uri] }); return true;
  } catch (e) { return false; }
}

/* ------------------------------------------------------------------ Receive money */
export function openReceive(ctx) {
  const { openSheet, toast, haptic } = ctx;
  openSheet(`<h3>Receive money</h3><p class="sub">Anyone can scan this with any UPI app to pay you.</p>
    <div class="form-row"><label>Your UPI ID</label><input class="field" id="rVpa" placeholder="yourname@okaxis" autocapitalize="off" autocomplete="off" value="${esc(store.s.myVpa || '')}"></div>
    <div class="tool-row"><div class="form-row"><label>Amount (optional)</label><input class="field" id="rAmt" inputmode="decimal" placeholder="Any amount"></div>
    <div class="form-row"><label>Note (optional)</label><input class="field" id="rNote" maxlength="40" placeholder="For…"></div></div>
    <div class="qr-stage" id="rQr"><div class="qr-empty">${icon('scan')}<span>Enter your UPI ID to make your QR</span></div></div>
    <div class="btn-row mt"><button class="btn primary press" id="rShare">${icon('share')} Share QR</button><button class="btn press" id="rLink">${icon('copy')} Copy link</button></div>`, {
    onMount(el) {
      let png = null, t = 0;
      const P = UPI.upiPlugin();
      const draw = async () => {
        const v = $('#rVpa', el).value.trim(), am = +$('#rAmt', el).value || 0, note = $('#rNote', el).value.trim();
        const box = $('#rQr', el);
        if (!VPA_RE.test(v)) { png = null; box.innerHTML = `<div class="qr-empty">${icon('scan')}<span>Enter your UPI ID to make your QR</span></div>`; return; }
        if (store.s.myVpa !== v) { store.s.myVpa = v; store.save(); }
        const link = myLink(am, note);
        if (P && P.makeQr) {
          try { png = (await P.makeQr({ text: link, size: 720 })).png; } catch (e) { png = null; }
        }
        box.innerHTML = png ? `<div class="qr-card"><img src="data:image/png;base64,${png}" alt="Your UPI QR"><b>${esc(store.s.name || '')}</b><small>${esc(v)}${am ? ' · ' + money(am, { force: true }) : ''}</small></div>`
          : `<div class="qr-empty">${icon('copy')}<span>${esc(link)}</span></div>`;
      };
      ['rVpa', 'rAmt', 'rNote'].forEach(id => $('#' + id, el).addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 220); }));
      draw();
      $('#rLink', el).onclick = async () => { const l = myLink(+$('#rAmt', el).value || 0, $('#rNote', el).value.trim()); if (!l) return toast('Add your UPI ID first', 'alert'); await UPI.copyText(l); haptic('tap'); toast('Payment link copied', 'check'); };
      $('#rShare', el).onclick = async () => {
        const am = +$('#rAmt', el).value || 0, l = myLink(am, $('#rNote', el).value.trim());
        if (!l) return toast('Add your UPI ID first', 'alert');
        const msg = `Pay ${esc(store.s.name || 'me')}${am ? ' ' + money(am, { force: true }) : ''} via UPI: ${l}`;
        if (png && await sharePng(png, 'vedverse-receive.png', 'Pay me', msg)) return;
        await shareText(msg, 'Pay me') || toast('Link copied — paste it anywhere', 'copy');
      };
    },
  });
}

/* ------------------------------------------------------------------ Split a bill */
export function openSplit(ctx) {
  const { openSheet, toast, haptic } = ctx;
  let people = 2, incl = true;
  openSheet(`<h3>Split a bill</h3><p class="sub">Work out everyone’s share and send them a link that pays you.</p>
    <div class="form-row"><label>Total bill</label><input class="field big-in" id="sTot" inputmode="decimal" placeholder="${store.s.currency}0"></div>
    <div class="form-row"><label>Split between</label><div class="stepper"><button class="btn press" data-s="-1">−</button><b id="sPeople">2 people</b><button class="btn press" data-s="1">+</button></div></div>
    <div class="row glass" data-incl style="border-radius:18px"><div class="lbl"><b>Include me</b><small>Your share counts too</small></div><div class="sw on"></div></div>
    <div class="form-row"><label>Tip / extra %</label><div class="chips-row" id="sTip">${[0, 5, 10, 15].map(p => `<button class="chip ${p === 0 ? 'on' : ''}" data-tip="${p}">${p}%</button>`).join('')}</div></div>
    <div class="split-out glass" id="sOut"></div>
    <div class="form-row"><label>What for</label><input class="field" id="sNote" maxlength="40" placeholder="Dinner, cab, trip…"></div>
    <button class="btn primary full press mt" id="sSend">${icon('share')} Request each person’s share</button>`, {
    onMount(el) {
      let tip = 0;
      const calc = () => {
        const tot = (+$('#sTot', el).value || 0) * (1 + tip / 100);
        const each = people > 0 ? Math.ceil(tot / people * 100) / 100 : 0;
        const others = incl ? people - 1 : people;
        $('#sPeople', el).textContent = `${people} ${people === 1 ? 'person' : 'people'}`;
        $('#sOut', el).innerHTML = `<div><small>Each pays</small><b class="num">${money(each, { force: true })}</b></div><div><small>You collect</small><b class="num">${money(each * Math.max(0, others), { force: true })}</b></div>`;
        return { each, tot };
      };
      $('#sTot', el).addEventListener('input', calc);
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { people = Math.max(1, Math.min(50, people + +b.dataset.s)); haptic('tick'); calc(); });
      $('[data-incl]', el).onclick = () => { incl = !incl; $('[data-incl] .sw', el).classList.toggle('on', incl); haptic('tick'); calc(); };
      $('#sTip', el).onclick = e => { const c = e.target.closest('[data-tip]'); if (!c) return; tip = +c.dataset.tip; el.querySelectorAll('[data-tip]').forEach(x => x.classList.toggle('on', x === c)); haptic('tick'); calc(); };
      calc();
      $('#sSend', el).onclick = async () => {
        const { each } = calc(), note = $('#sNote', el).value.trim() || 'Split bill';
        if (!(each > 0)) return toast('Enter the total first', 'alert');
        if (!store.s.myVpa) { toast('Add your UPI ID in Receive money first', 'alert'); return; }
        const msg = `${note}: your share is ${money(each, { force: true })}. Pay me here → ${myLink(each, note)}`;
        haptic('success');
        await shareText(msg, note) || toast('Request copied — paste it in your group chat', 'copy');
      };
    },
  });
}

/* ------------------------------------------------------------------ Bills & reminders */
const bills = () => (store.data.bills = store.data.bills || []);
export function dueList() {
  const today = new Date(), d = today.getDate(), dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const ym = today.getFullYear() * 100 + today.getMonth();
  return bills().map(b => {
    const paid = b.paidYm === ym;
    const day = Math.min(+b.day || 1, dim);
    const inDays = paid ? (day - d + dim) : day - d;
    return { ...b, paid, inDays };
  }).sort((a, b) => (a.paid - b.paid) || (a.inDays - b.inDays));
}
export function markBillPaid(pa) {
  const t = new Date(), ym = t.getFullYear() * 100 + t.getMonth();
  const b = bills().find(x => x.pa === pa && x.paidYm !== ym); if (b) { b.paidYm = ym; store.save(); }
}
export function openBills(ctx) {
  const { openSheet, toast, haptic, openPay } = ctx;
  const render = (el) => {
    const list = dueList();
    $('#bList', el).innerHTML = list.length ? list.map(b => `<div class="bill ${b.paid ? 'paid' : b.inDays < 0 ? 'late' : b.inDays <= 3 ? 'soon' : ''}">
        <div class="bill-ic">${esc((b.name || '?')[0].toUpperCase())}</div>
        <div class="bill-t"><b>${esc(b.name)}</b><small>${money(b.am, { force: true })} · ${b.paid ? 'paid this month ✓' : b.inDays < 0 ? `overdue ${-b.inDays}d` : b.inDays === 0 ? 'due today' : `due in ${b.inDays}d`} · day ${b.day}</small></div>
        ${b.paid ? '' : `<button class="btn primary press" data-pay="${esc(b.id)}">Pay</button>`}<button class="icon-btn press" data-del="${esc(b.id)}">${icon('close')}</button></div>`).join('')
      : `<div class="w-empty">No bills yet. Add rent, recharge, Wi-Fi or subscriptions below.</div>`;
  };
  openSheet(`<h3>Bills & reminders</h3><p class="sub">Save what you pay every month. One tap opens Pay with everything filled in.</p>
    <div id="bList" class="bills"></div>
    <div class="bill-add glass"><b>Add a bill</b>
      <input class="field" id="bName" placeholder="Name (Rent, Wi-Fi…)" maxlength="30">
      <input class="field" id="bPa" placeholder="Their UPI ID" autocapitalize="off" autocomplete="off">
      <div class="tool-row"><input class="field" id="bAm" inputmode="decimal" placeholder="Amount"><input class="field" id="bDay" inputmode="numeric" placeholder="Due day (1-31)"></div>
      <button class="btn press full" id="bAdd">${icon('plus')} Save bill</button></div>`, {
    tall: true,
    onMount(el, close) {
      render(el);
      $('#bAdd', el).onclick = () => {
        const name = $('#bName', el).value.trim(), pa = $('#bPa', el).value.trim(), am = +$('#bAm', el).value || 0, day = Math.max(1, Math.min(31, +$('#bDay', el).value || 1));
        if (!name || !VPA_RE.test(pa) || !(am > 0)) { toast('Add a name, a valid UPI ID and an amount', 'alert'); haptic('error'); return; }
        bills().push({ id: 'b' + Date.now().toString(36), name, pa, am, day });
        store.save(); haptic('success'); toast(`${name} saved`, 'check');
        ['bName', 'bPa', 'bAm', 'bDay'].forEach(i => { $('#' + i, el).value = ''; });
        render(el);
      };
      el.addEventListener('click', e => {
        const p = e.target.closest('[data-pay]'), d = e.target.closest('[data-del]');
        if (p) { const b = bills().find(x => x.id === p.dataset.pay); if (!b) return; close(); setTimeout(() => openPay(UPI.parseQR(`upi://pay?pa=${encodeURIComponent(b.pa)}&pn=${encodeURIComponent(b.name)}`), { amount: b.am, note: b.name }), 200); }
        if (d) { store.data.bills = bills().filter(x => x.id !== d.dataset.del); store.save(); haptic('tap'); render(el); }
      });
    },
  });
}

/* ------------------------------------------------------------------ App icon & name (launcher) */
export async function openIdentity(ctx) {
  const { openSheet, toast, haptic } = ctx;
  let cat;
  try { cat = await (await fetch('assets/appicons/catalog.json')).json(); } catch (e) { toast('Icon catalog missing', 'alert'); return; }
  const P = UPI.upiPlugin();
  let cur = { icon: 0, name: 0 };
  try { if (P && P.getAppIcon) cur = await P.getAppIcon(); } catch (e) {}
  const sel = { icon: cur.icon, name: cur.name };
  const thumb = id => `assets/appicons/${String(id).padStart(2, '0')}.webp`;
  const fancy = n => /[^\x00-\x7F]/.test(n);
  const launch = new Set(cat.launcher || cat.names.map((_, i) => i));
  openSheet(`<h3>App icon & name</h3><p class="sub">Changes how Vedverse looks on your home screen and app drawer.</p>
    <div class="id-phone"><div class="id-grid">
      ${['#1f2937', '#334155', '#3f3f46'].map(c => `<div class="id-app ghost"><i style="background:${c}"></i><span>App</span></div>`).join('')}
      <div class="id-app me"><img id="idPrevIc" alt=""><span id="idPrevName"></span></div>
    </div></div>
    <div class="form-row"><label>Icon · <span id="idIcName"></span></label><div class="id-icons">${cat.icons.map(ic => `<button class="id-ic press" data-ic="${ic.id}" title="${esc(ic.name)} ${esc(ic.view)}"><img src="${thumb(ic.id)}" loading="lazy" alt=""></button>`).join('')}</div></div>
    <div class="form-row"><label>Name</label><div class="seg id-filter"><button class="on" data-f="all">All</button><button data-f="plain">Plain</button><button data-f="fancy">Fancy fonts</button></div>
      <div class="id-names">${cat.names.map((n, i) => `<button class="chip id-nm ${launch.has(i) ? '' : 'sc'}" data-nm="${i}" data-kind="${fancy(n) ? 'fancy' : 'plain'}">${esc(n)}${launch.has(i) ? '' : '<sup>↗</sup>'}</button>`).join('')}</div>
      <small class="muted tiny" style="display:block;margin-top:8px">↗ = added as a home-screen shortcut (Android allows only a limited number of app-drawer names). Same look, same tap.</small></div>
    <button class="btn primary full press mt" id="idApply">${icon('check')} Apply to home screen</button>
    <small class="muted tiny mt" style="display:block">Vedverse closes once while Android switches the icon. Some launchers take a few seconds; if the home-screen icon disappears, add it again from the app drawer.</small>`, {
    tall: true,
    onMount(el, close) {
      const $ = (s) => el.querySelector(s);
      const paint = () => {
        $('#idPrevIc').src = thumb(sel.icon);
        $('#idPrevName').textContent = cat.names[sel.name];
        const ic = cat.icons.find(x => x.id === sel.icon) || cat.icons[0];
        $('#idIcName').textContent = ic.id ? `${ic.name} · ${ic.view}` : ic.name;
        el.querySelectorAll('[data-ic]').forEach(b => b.classList.toggle('on', +b.dataset.ic === sel.icon));
        el.querySelectorAll('[data-nm]').forEach(b => b.classList.toggle('on', +b.dataset.nm === sel.name));
        $('#idApply').disabled = sel.icon === cur.icon && sel.name === cur.name;
      };
      el.addEventListener('click', e => {
        const ic = e.target.closest('[data-ic]'), nm = e.target.closest('[data-nm]'), f = e.target.closest('[data-f]');
        if (ic) { sel.icon = +ic.dataset.ic; haptic('tick'); paint(); }
        if (nm) { sel.name = +nm.dataset.nm; haptic('tick'); paint(); }
        if (f) { el.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', b === f)); el.querySelectorAll('.id-nm').forEach(b => { b.hidden = f.dataset.f !== 'all' && b.dataset.kind !== f.dataset.f; }); haptic('tick'); }
      });
      $('#idApply').onclick = async () => {
        if (!P || !P.setAppIcon) { toast('Available in the Android app', 'info'); return; }
        try {
          let r;
          if (launch.has(sel.name)) { r = await P.setAppIcon({ icon: sel.icon, name: sel.name }); cur = { ...sel }; }
          else {
            const keep = launch.has(cur.name) ? cur.name : 0;
            await P.setAppIcon({ icon: sel.icon, name: keep });
            const pr = await P.pinShortcut({ label: cat.names[sel.name], icon: sel.icon });
            cur = { icon: sel.icon, name: keep }; r = { changed: true };
            toast(pr && pr.ok ? 'Confirm “Add to home screen” on the next screen' : 'Long-press the home screen to add it', 'check', 3500);
          }
          haptic('success'); paint(); if (ctx.logEvent) ctx.logEvent('icon', { title: `App icon & name → ${cat.names[sel.name]}` });
          toast(r && r.changed ? `Now “${cat.names[sel.name]}” on your home screen` : 'Already using this one', 'check', 3000);
        } catch (e) { toast('Couldn’t change the icon', 'alert'); }
      };
      paint();
    },
  });
}

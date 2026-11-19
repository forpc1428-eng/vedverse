// Vedverse — notifications: tone packs, smart nudges, quiet hours, daily cap, custom reminders (Notification Studio),
// action buttons (Pay now / Snooze / Mark paid / Yes-No), rich chart images, lock-screen privacy, quick bar,
// and a friendly, optional permission prompt. Everything is computed on the phone and scheduled with AlarmManager.
import { store, stats, money, daily, sum, paid, DAY, startOfDay } from './store.js';
import { icon } from './icons.js';
import { FEST } from './extras.js';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const X = () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.VedExtras) || null;
const rnd = a => a[Math.floor(Math.random() * a.length)];
const M = v => money(v, { force: true });

/* ================================================================== tone packs */
export const TONES = {
  friendly: { name: 'Friendly', em: '😊', m: {
    checkin2: [['Evening check-in', 'Hey {n}, all of today’s payments logged? Tap to review.']],
    checkin: [['Quick check-in', 'Hey {n}, you spent {amt} today. Tap to log anything you missed.'], ['How was today?', '{amt} spent so far, {n}. All payments logged?']],
    limit: [['Over today’s limit', 'You’ve spent {amt} today, a bit above your {limit} plan. Tomorrow’s a fresh start!'], ['Slight overshoot today', '{amt} today vs {limit} planned. No stress, just a heads-up.']],
    streak: [['3 busy days in a row', 'You’ve crossed your daily plan {days} days running. Maybe a calm day tomorrow?']],
    nospend: [['No-spend day! 🎉', 'Not a single rupee spent today, {n}. Nicely done!'], ['Zero-spend day ✨', 'Your wallet took a day off. Love it!']],
    goal: [['{p}% of {goal}', 'You’ve saved {amt} towards {goal}. Keep going, {n}!']],
    monthend: [['Your month in Vedverse', 'Spent {amt} this month · {left} left of your budget.']],
    payday: [['Payday 💸', 'Salary day, {n}! Set aside something for {goal} first?']],
    recurring: [['Looks like a regular payment', 'You pay {who} around this date every month ({amt}). Add it as a bill?']],
    pending: [['Did it go through?', 'Your {amt} payment to {who} is still pending. Did it succeed?']],
    billSoon: [['{bill} is due tomorrow', '{amt} to {who}. Tap Pay now when ready.']],
    billToday: [['{bill} is due today', '{amt} to {who}. One tap and you’re done.']],
    budget80: [['80% of your budget used', '{amt} spent this month · {safe}/day is safe now.']],
    budget100: [['Monthly budget crossed', '{amt} spent of {limit}. Let’s slow down a little.']],
    weekly: [['Your week in Vedverse', 'Spent {amt} this week · {left} left this month.']],
    test: [['Notifications look great', 'This is how Vedverse will reach you, {n}.']],
  } },
  coach: { name: 'Strict coach', em: '🫡', m: {
    checkin2: [['Check-in. Now.', 'Review today’s spending, {n}. Log everything.']],
    checkin: [['Daily report. Now.', '{amt} spent today. Log everything. No excuses, {n}.'], ['Check-in time', 'Numbers don’t lie: {amt} today. Review it.']],
    limit: [['LIMIT BROKEN', '{amt} today. Plan was {limit}. Tighten up tomorrow.'], ['You went over.', '{amt} against {limit}. Discipline beats regret.']],
    streak: [['{days} days over plan', 'That’s a pattern, not an accident. Fix it today.']],
    nospend: [['Zero spent. Good.', 'That’s how it’s done. Repeat tomorrow.']],
    goal: [['{p}% done', '{amt} saved for {goal}. Don’t slow down now.']],
    monthend: [['Month closed', '{amt} spent. {left} left. Review and plan the next one.']],
    payday: [['Payday. Save first.', 'Move money to {goal} BEFORE you spend anything.']],
    recurring: [['Recurring spend detected', '{who} gets {amt} every month. Track it as a bill.']],
    pending: [['Unconfirmed payment', '{amt} to {who} is still pending. Confirm it.']],
    billSoon: [['{bill} due tomorrow', '{amt}. Pay on time. No late fees.']],
    billToday: [['{bill} due TODAY', '{amt} to {who}. Do it now.']],
    budget80: [['80% gone', '{amt} spent. Only {safe}/day allowed now.']],
    budget100: [['Budget blown', '{amt} spent of {limit}. Freeze non-essentials.']],
    weekly: [['Weekly review', '{amt} this week. {left} left this month. Stay sharp.']],
    test: [['Coach mode on', 'I’ll keep you honest, {n}.']],
  } },
  desi: { name: 'Desi Hinglish', em: '🇮🇳', m: {
    checkin2: [['Aaj ka hisaab?', '{n}, aaj ke saare payments note kar liye?']],
    checkin: [['Aaj ka hisaab?', '{n}, aaj {amt} kharch hua. Sab note kar liya?'], ['Din khatam, hisaab shuru', 'Aaj ka total {amt}. Kuch chhoot toh nahi gaya?']],
    limit: [['Arre bhai, limit cross!', 'Aaj {amt} ho gaya, plan tha {limit}. Kal thoda sambhal ke 😅'], ['Thoda zyada ho gaya', '{amt} aaj, limit {limit}. Chalta hai, kal se pakka!']],
    streak: [['{days} din se over budget', 'Bhai ye roz ka ho gaya hai. Kal ek chill day?']],
    nospend: [['Aaj zero kharcha! 🎉', 'Ek rupaya bhi nahi! Kya baat hai {n}!']],
    goal: [['{goal} ka {p}% ho gaya', '{amt} jama! Bas aise hi lage raho {n} 💪']],
    monthend: [['Mahine ka hisaab', 'Is mahine {amt} gaya, {left} bacha hai.']],
    payday: [['Salary aa gayi! 💸', 'Pehle {goal} ke liye kuch side mein rakh lo, phir party.']],
    recurring: [['Ye toh har mahine hota hai', '{who} ko har mahine {amt}. Bill bana dein?']],
    pending: [['Payment hua ya nahi?', '{who} ko {amt} abhi pending hai. Ho gaya kya?']],
    billSoon: [['Kal {bill} bharna hai', '{amt} {who} ko. Yaad se!']],
    billToday: [['Aaj {bill} ka din hai', '{amt} {who} ko. Ek tap mein khatam.']],
    budget80: [['80% budget khatam', '{amt} gaya. Ab roz {safe} tak hi.']],
    budget100: [['Budget ka the end 😬', '{amt} kharch, limit thi {limit}. Ab brake lagao.']],
    weekly: [['Hafte ka hisaab', 'Is hafte {amt}. Mahine mein {left} bacha.']],
    test: [['Sab set hai!', 'Aise aayenge notifications, {n} 👍']],
  } },
  funny: { name: 'Funny', em: '😂', m: {
    checkin2: [['Wallet roll call', 'Every rupee present and accounted for, {n}?']],
    checkin: [['Your wallet wants a word', '{amt} today. It’s not mad, just disappointed.'], ['Daily wallet gossip', 'Spent {amt}. The rupees are talking, {n}.']],
    limit: [['Wallet.exe has stopped', '{amt} today vs {limit} planned. Have you tried turning shopping off and on again?'], ['Houston, we have a spend', '{amt} today. The plan was {limit}. The plan is crying.']],
    streak: [['{days}-day spending combo!', 'Achievement unlocked: “Money? What money?”']],
    nospend: [['Zero spent today 🏆', 'Your wallet is so proud it wrote you a poem.']],
    goal: [['{goal}: {p}% loaded…', '{amt} saved. Future you is doing a happy dance.']],
    monthend: [['Monthly plot twist', 'Spent {amt}. {left} survived. Respect.']],
    payday: [['Money has entered the chat', 'Payday! Quick, hide some in {goal} before you see it.']],
    recurring: [['Déjà vu?', 'You pay {who} {amt} every month like clockwork. Make it a bill?']],
    pending: [['Schrödinger’s payment', '{amt} to {who}: paid AND not paid. Help me collapse the wave.']],
    billSoon: [['{bill} is coming for you', 'Tomorrow. {amt}. It knows where you live.']],
    billToday: [['{bill} has arrived 👀', '{amt} to {who}. It brought friends: late fees. Pay now?']],
    budget80: [['Budget at 80% 🍕', 'Only {safe}/day now. Pizza is a want, not a need. Probably.']],
    budget100: [['Budget has left the building', '{amt} of {limit}. It said goodbye. You didn’t listen.']],
    weekly: [['Weekly roast', 'You spent {amt} this week. {left} left. I’m not judging. Okay, a little.']],
    test: [['Testing… 1, 2, ₹3', 'If you can read this, your notifications work. Yay!']],
  } },
  motivate: { name: 'Motivational', em: '🔥', m: {
    checkin2: [['Reflect & grow', 'Take 10 seconds to review today, {n}. Awareness is power.']],
    checkin: [['Small steps, big wins', '{amt} today. Every logged rupee builds your future, {n}.'], ['Own your day', 'You spent {amt}. Awareness is power.']],
    limit: [['Reset, don’t regret', '{amt} today vs {limit}. Tomorrow you bounce back stronger.']],
    streak: [['Time to rewrite the streak', '{days} days over. One good day changes everything.']],
    nospend: [['Champion move 🏆', 'A whole day with zero spend. That’s discipline, {n}!']],
    goal: [['{p}% closer to {goal}', '{amt} saved. Dreams are built one rupee at a time.']],
    monthend: [['A month of progress', '{amt} spent, {left} saved from the budget. Proud of you.']],
    payday: [['Pay yourself first', 'Payday! Fund {goal} today, thank yourself tomorrow.']],
    recurring: [['Make it automatic', '{who} · {amt} every month. Add as a bill and never miss it.']],
    pending: [['Finish strong', '{amt} to {who} is pending. Confirm and close the loop.']],
    billSoon: [['Stay ahead', '{bill} is due tomorrow ({amt}). Winners pay early.']],
    billToday: [['Today’s win: {bill}', '{amt} to {who}. Tick it off!']],
    budget80: [['Final stretch', '80% used. {safe}/day keeps you on track. You’ve got this.']],
    budget100: [['Setback, not the end', '{amt} of {limit}. Next month we come back stronger.']],
    weekly: [['Week complete 💪', '{amt} spent. {left} left this month. Keep the momentum.']],
    test: [['You’re all set 🔥', 'Let’s build great money habits, {n}.']],
  } },
  cosmic: { name: 'Cosmic poet', em: '🌌', m: {
    checkin2: [['Night falls on your orbit', 'Shall we chart today’s stars, {n}?']],
    checkin: [['The day folds into night', '{amt} drifted through your orbit today, {n}.'], ['Starlight check-in', 'Today’s gravity pulled {amt}. Shall we chart it?']],
    limit: [['Past the event horizon', '{amt} today, beyond your {limit} orbit. Tomorrow, a gentler arc.']],
    streak: [['A {days}-day solar flare', 'Your spend burned hot for {days} days. Let it cool to starlight.']],
    nospend: [['A silent galaxy ✨', 'Nothing spent today. The universe is calm, {n}.']],
    goal: [['{goal}: {p}% of the way to the stars', '{amt} gathered, like stardust becoming a planet.']],
    monthend: [['A month completes its orbit', '{amt} spent, {left} still shining.']],
    payday: [['A new sun rises', 'Payday, {n}. Send some light to {goal} first.']],
    recurring: [['A familiar comet returns', '{who} crosses your sky every month ({amt}). Name it a bill?']],
    pending: [['Lost in the nebula?', '{amt} to {who} still drifts, pending. Did it land?']],
    billSoon: [['{bill} approaches', 'Tomorrow its orbit meets yours: {amt}.']],
    billToday: [['{bill} is overhead tonight', '{amt} to {who}. Guide it home.']],
    budget80: [['The disk glows brighter', '80% of your budget gone. {safe}/day keeps the orbit stable.']],
    budget100: [['Supernova', '{amt} of {limit}. Time to let the stars rest.']],
    weekly: [['Seven days of starlight', '{amt} this week, {left} left in this month’s sky.']],
    test: [['A signal from Vedverse', 'The cosmos can reach you now, {n}.']],
  } },
  minimal: { name: 'Minimal', em: '·', m: {
    checkin2: [['Check-in', 'Review today.']],
    checkin: [['Today', '{amt} spent.']], limit: [['Over limit', '{amt} / {limit}']], streak: [['{days} days over', 'Daily plan exceeded.']],
    nospend: [['No spend', '₹0 today.']], goal: [['{goal} {p}%', '{amt} saved.']], monthend: [['Month', '{amt} spent · {left} left']],
    payday: [['Payday', 'Save for {goal}.']], recurring: [['Recurring', '{who} · {amt}/month']], pending: [['Pending', '{amt} → {who}']],
    billSoon: [['{bill} tomorrow', '{amt}']], billToday: [['{bill} today', '{amt}']], budget80: [['Budget 80%', '{safe}/day left']],
    budget100: [['Budget 100%', '{amt} / {limit}']], weekly: [['Week', '{amt} · {left} left']], test: [['Vedverse', 'Notifications on.']],
  } },
};
function msg(key, v = {}) {
  const pack = TONES[store.s.notifTone] || TONES.friendly;
  const list = pack.m[key] || TONES.friendly.m[key] || [['Vedverse', '']];
  const [t, b] = rnd(list);
  const s = store.s;
  const vars = { n: (s.name || '').split(' ')[0] || 'there', goal: s.goalName || 'your goal', limit: M(s.dailyBudget), ...v };
  const f = str => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
  return { title: f(t), body: f(b) };
}

/* ================================================================== styling shared by every notification */
function style(o, kind) {
  const s = store.s;
  const accent = s.notifColor || s.accent || '#f2a144';
  return { ...o, sound: s.notifSound, vib: s.notifVib, heads: !!s.notifHeads || kind === 'bill', color: /^#[0-9a-f]{6}$/i.test(accent) ? accent : '#f2a144',
    private: !!s.notifPrivate, publicText: kind === 'bill' ? 'A bill reminder' : 'You have a new reminder', actions: s.notifActions ? (o.actions || []) : [] };
}
const inQuiet = (h, a, b) => a === b ? false : a > b ? (h >= a || h < b) : (h >= a && h < b);
function unquiet(at) {
  const s = store.s; if (!s.notifQuiet) return at;
  const d = new Date(at);
  if (!inQuiet(d.getHours(), +s.quietFrom, +s.quietTo)) return at;
  const n = new Date(d); n.setHours(+s.quietTo, 0, 0, 0);
  if (n.getTime() <= at) n.setDate(n.getDate() + 1);
  return n.getTime();
}
const at = (date, h, m = 0) => { const d = new Date(date); d.setHours(h, m, 0, 0); return d.getTime(); };
const dayKey = t => new Date(t).toDateString();

/* ================================================================== rich chart image */
function chartImage(title, values, sub) {
  try {
    const W = 720, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#05060d'); bg.addColorStop(1, '#120a1c'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    let s = 9; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) { const z = r(); g.fillStyle = `rgba(255,240,225,${0.15 + z * 0.6})`; g.beginPath(); g.arc(r() * W, r() * H, z * 1.6 + 0.3, 0, 7); g.fill(); }
    const acc = store.s.notifColor || store.s.accent || '#f2a144';
    g.fillStyle = '#fff'; g.font = '600 30px Sora, sans-serif'; g.fillText(title, 32, 52);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '20px Inter, sans-serif'; g.fillText(sub || '', 32, 84);
    const max = Math.max(1, ...values), n = values.length, bw = (W - 64) / n;
    values.forEach((v, i) => {
      const h = (v / max) * (H - 150), x = 32 + i * bw + bw * 0.18, y = H - 36 - h;
      const gr = g.createLinearGradient(0, y, 0, H - 36); gr.addColorStop(0, acc); gr.addColorStop(1, 'rgba(255,255,255,.08)');
      g.fillStyle = gr; const w = bw * 0.64, rr = Math.min(8, w / 2);
      g.beginPath(); g.moveTo(x, H - 36); g.lineTo(x, y + rr); g.quadraticCurveTo(x, y, x + rr, y); g.lineTo(x + w - rr, y); g.quadraticCurveTo(x + w, y, x + w, y + rr); g.lineTo(x + w, H - 36); g.fill();
    });
    return c.toDataURL('image/jpeg', 0.82);
  } catch (e) { return ''; }
}

/* ================================================================== recurring-payment detection */
export function recurring() {
  const bills = new Set((store.data.bills || []).map(b => b.pa));
  const by = {};
  store.data.tx.filter(t => t.status === 'paid' && t.pa && !bills.has(t.pa) && t.ts > Date.now() - 200 * DAY).forEach(t => { (by[t.pa] = by[t.pa] || []).push(t); });
  const out = [];
  Object.entries(by).forEach(([pa, list]) => {
    const months = new Set(list.map(t => { const d = new Date(t.ts); return d.getFullYear() * 12 + d.getMonth(); }));
    if (months.size < 3) return;
    const days = list.map(t => new Date(t.ts).getDate()).sort((a, b) => a - b);
    const med = days[days.length >> 1];
    if (days.filter(d => Math.abs(d - med) <= 3).length < 3) return;
    const am = list.slice(0, 3).reduce((a, t) => a + (+t.am || 0), 0) / Math.min(3, list.length);
    out.push({ pa, pn: list[0].pn || pa, day: med, am: Math.round(am) });
  });
  return out.slice(0, 8);
}

/* ================================================================== custom reminders (Notification Studio) */
export const OPENS = { 'vedverse://home': 'Home', 'vedverse://scan': 'Scanner', 'vedverse://bills': 'Bills', 'vedverse://stats': 'Insights', 'vedverse://history': 'History', 'vedverse://receive': 'Receive', 'vedverse://manual': 'Pay UPI ID' };
const REPEAT = { once: 'Once', daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly' };
function occurrences(r, horizon) {
  const [hh, mm] = String(r.time || '09:00').split(':').map(Number);
  const out = []; const now = Date.now();
  if (r.repeat === 'once') { const t = new Date(`${r.date || new Date().toISOString().slice(0, 10)}T00:00`); const v = at(t, hh, mm); if (v > now) out.push(v); return out; }
  for (let i = 0; i < horizon && out.length < 14; i++) {
    const d = new Date(startOfDay() + i * DAY), wd = d.getDay();
    if (r.repeat === 'weekdays' && (wd === 0 || wd === 6)) continue;
    if (r.repeat === 'weekly' && wd !== (+r.wd || 0)) continue;
    if (r.repeat === 'monthly' && d.getDate() !== Math.min(+r.md || 1, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())) continue;
    const v = at(d, hh, mm); if (v > now) out.push(v);
  }
  return out;
}

/* ================================================================== the scheduler */
export function buildSchedule() {
  const s = store.s, st = stats(), items = []; const now = new Date(); const hh = +s.remindHour || 9;
  const push = (o, kind, prio = 5) => { o.at = unquiet(o.at); items.push({ ...style(o, kind), kind, prio }); };
  // bills: day before + due day, with Pay now / Mark paid / Snooze
  if (s.remindBills) (store.data.bills || []).slice(0, 24).forEach((b, i) => {
    const ym = now.getFullYear() * 100 + now.getMonth();
    for (let m = 0; m < 2; m++) {
      if (m === 0 && b.paidYm === ym) continue;
      const due = new Date(now.getFullYear(), now.getMonth() + m, Math.min(+b.day || 1, 28));
      const v = { amt: M(b.am), who: b.pn || b.pa, bill: b.name };
      const pay = `vedverse://pay?pa=${encodeURIComponent(b.pa)}&am=${b.am}&pn=${encodeURIComponent(b.name)}`;
      const acts = [{ act: 'url', label: 'Pay now', url: pay }, { act: 'paid', label: 'Mark paid', ref: 'bill:' + b.pa }, { act: 'snooze', label: 'Snooze 1h' }];
      push({ id: 100 + i * 4 + m * 2, at: at(due.getTime() - DAY, hh), ...msg('billSoon', v), url: pay, actions: acts, emoji: '🧾' }, 'bill', 1);
      push({ id: 101 + i * 4 + m * 2, at: at(due, hh), ...msg('billToday', v), url: pay, actions: acts, emoji: '🧾' }, 'bill', 1);
    }
  });
  // weekly digest (Sunday 7 pm) with chart
  if (s.weeklyDigest) {
    const d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    const o = { id: 80, at: at(d, 19), ...msg('weekly', { amt: M(st.week), left: M(st.remaining) }), url: 'vedverse://stats', emoji: '📊' };
    if (s.notifRich) o.image = chartImage('Last 7 days', daily(7).map(x => x.v), `${M(st.week)} this week`);
    push(o, 'digest', 4);
  }
  // daily check-in (next 7 days)
  if (s.nudgeCheckin) for (let i = 0; i < 7; i++) {
    const d = startOfDay() + i * DAY;
    push({ id: 300 + i, at: at(d, +s.checkinHour || 21), ...(i === 0 ? msg('checkin', { amt: M(st.today) }) : msg('checkin2')), url: 'vedverse://history', emoji: '🌙' }, 'checkin', 6);
  }
  // no-spend celebration tonight (re-evaluated on every change)
  if (s.nudgeNoSpend && st.today === 0 && store.data.tx.length > 3) push({ id: 308, at: at(startOfDay(), 21, 30), ...msg('nospend'), url: 'vedverse://stats', emoji: '🎉' }, 'nospend', 7);
  // month-end summary (last day 8 pm) with chart
  if (s.nudgeMonthEnd) {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const o = { id: 310, at: at(last, 20), ...msg('monthend', { amt: M(st.month), left: M(st.remaining) }), url: 'vedverse://stats', emoji: '🗓️' };
    if (s.notifRich) o.image = chartImage(now.toLocaleDateString('en-IN', { month: 'long' }), daily(now.getDate()).map(x => x.v), `${M(st.month)} spent`);
    push(o, 'monthend', 3);
  }
  // payday
  if (s.nudgePayday) for (let m = 0; m < 2; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, Math.min(+s.paydayDay || 1, 28));
    push({ id: 312 + m, at: at(d, hh), ...msg('payday'), url: 'vedverse://home', emoji: '💸' }, 'payday', 3);
  }
  // recurring-payment suggestions, the day before they usually happen
  if (s.nudgeRecurring) recurring().forEach((r, i) => {
    if (store.data.nsent['rec:' + r.pa]) return;
    let d = new Date(now.getFullYear(), now.getMonth(), Math.min(r.day, 28) - 1); if (d.getTime() < Date.now()) d = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(r.day, 28) - 1);
    push({ id: 320 + i, at: at(d, hh), ...msg('recurring', { who: r.pn, amt: M(r.am) }), url: 'vedverse://bills', emoji: '🔁', actions: [{ act: 'url', label: 'Add as bill', url: 'vedverse://bills' }] }, 'recurring', 6);
  });
  // pending-payment follow-ups (15 min after) with Yes / No
  if (s.nudgePending) store.data.tx.filter(t => t.status === 'pending' && t.ts > Date.now() - 2 * DAY).slice(0, 20).forEach((t, i) => {
    push({ id: 700 + i, at: Math.max(Date.now() + 60000, t.ts + 15 * 60000), ...msg('pending', { amt: M(t.am), who: t.pn || t.pa }), url: 'vedverse://history', emoji: '⏳', ref: 'tx:' + t.id,
      actions: [{ act: 'yes', label: 'Yes, paid', ref: 'tx:' + t.id }, { act: 'no', label: 'No, failed', ref: 'tx:' + t.id }, { act: 'snooze', label: 'Later' }] }, 'pending', 2);
  });
  // festivals (next 45 days, 9 am)
  if (s.nudgeFestival) { let k = 0; for (let i = 0; i < 45 && k < 6; i++) {
    const d = new Date(startOfDay() + i * DAY), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const f = FEST[iso] || FEST[iso.slice(5)]; if (!f) continue;
    const n = (s.name || '').split(' ')[0] || 'there';
    push({ id: 600 + k++, at: at(d, 9), title: f.replace('{n}', n), body: 'Wishing you a bright day from Vedverse ✨', url: 'vedverse://home' }, 'festival', 8);
  } }
  // daily cap (automatic nudges only; your own reminders and bills always come)
  const perDay = {}; const cap = +s.notifMax || 99;
  const kept = items.sort((a, b) => a.prio - b.prio || a.at - b.at).filter(o => {
    if (o.kind === 'bill' || o.kind === 'custom') return true;
    const k = dayKey(o.at); perDay[k] = (perDay[k] || 0) + 1; return perDay[k] <= cap;
  });
  // custom reminders (never moved by quiet hours: you picked the time)
  (store.data.reminders || []).filter(r => r.on !== false).slice(0, 14).forEach((r, ri) => {
    occurrences(r, 21).forEach((t, k) => kept.push({ ...style({ id: 400 + ri * 14 + k, at: t, title: r.title || 'Reminder', body: r.body || '', emoji: r.emoji || '', url: r.url || 'vedverse://home',
      actions: [{ act: 'snooze', label: 'Snooze 1h' }].concat(r.url && r.url !== 'vedverse://home' ? [{ act: 'url', label: 'Open', url: r.url }] : []) }, 'custom'), kind: 'custom' }));
  });
  return kept.map(({ kind, prio, ...o }) => o);
}

let schedT = null;
export function reschedule(delay = 2500) { clearTimeout(schedT); schedT = setTimeout(scheduleNow, delay); }
export async function scheduleNow() {
  const P = X(); if (!P) return;
  try { await P.schedule({ items: buildSchedule() }); } catch (e) { console.warn('schedule', e); }
}

/* ================================================================== live nudges (fire right away, respecting quiet hours + cap) */
function sentToday(k) { return store.data.nsent[k] === dayKey(Date.now()); }
async function fire(key, o, kind) {
  const s = store.s, P = X(); if (!P) return;
  if (s.notifQuiet && inQuiet(new Date().getHours(), +s.quietFrom, +s.quietTo)) return;
  const dk = 'count:' + dayKey(Date.now()); const n = +store.data.nsent[dk] || 0;
  if (n >= (+s.notifMax || 99)) return;
  store.data.nsent[key] = dayKey(Date.now()); store.data.nsent[dk] = n + 1;
  Object.keys(store.data.nsent).forEach(k => { if (k.startsWith('count:') && k !== dk) delete store.data.nsent[k]; });
  try { await P.show(style({ id: 3000 + (Math.abs(hash(key)) % 900), ...o }, kind)); } catch (e) {}
}
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
let liveT = null;
function live() {
  clearTimeout(liveT);
  liveT = setTimeout(() => {
    const s = store.s, st = stats(); let dirty = false;
    if (s.nudgeLimit && s.dailyBudget > 0 && st.today > s.dailyBudget && !sentToday('limit')) { fire('limit', { ...msg('limit', { amt: M(st.today) }), url: 'vedverse://stats', emoji: '⚠️' }, 'limit'); dirty = true; }
    if (s.nudgeStreak && s.dailyBudget > 0 && !sentToday('streak')) {
      const d = daily(3); if (d.every(x => x.v > s.dailyBudget)) { fire('streak', { ...msg('streak', { days: 3 }), url: 'vedverse://stats', emoji: '🔥' }, 'streak'); dirty = true; }
    }
    if (s.budgetAlerts && s.monthlyBudget > 0) {
      const pct = st.month / s.monthlyBudget, k = 'budget:' + new Date().toISOString().slice(0, 7) + (pct >= 1 ? 'b' : 'a');
      if (pct >= 0.8 && !store.data.nsent[k]) { store.data.nsent[k] = 1; fire('budget', { ...msg(pct >= 1 ? 'budget100' : 'budget80', { amt: M(st.month), limit: M(s.monthlyBudget), safe: M(Math.floor(st.allowance)) }), url: 'vedverse://stats', emoji: '📉' }, 'budget'); dirty = true; }
    }
    if (s.nudgeGoal && s.goalAmount > 0) {
      const p = [100, 75, 50, 25].find(x => s.goalSaved / s.goalAmount * 100 >= x);
      const k = 'goal:' + s.goalName + ':' + p;
      if (p && !store.data.nsent[k]) { store.data.nsent[k] = 1; fire('goal' + p, { ...msg('goal', { p, amt: M(s.goalSaved) }), url: 'vedverse://home', emoji: p === 100 ? '🏆' : '🎯' }, 'goal'); dirty = true; }
    }
    if (dirty) store.save();
  }, 1500);
}

/* ================================================================== buttons pressed on a notification */
let hooks = {};
function onAction(a) {
  if (!a || !a.ref) return;
  const [kind, id] = String(a.ref).split(/:(.*)/s);
  if (kind === 'tx') {
    const t = store.data.tx.find(x => x.id === id); if (!t || t.status !== 'pending') return;
    if (a.act === 'yes') store.updateTx(id, { status: 'paid', autoBy: 'notif-btn' });
    if (a.act === 'no') store.updateTx(id, { status: 'failed' });
    hooks.toast && hooks.toast(a.act === 'yes' ? `Marked ${M(t.am)} to ${esc(t.pn || t.pa)} as paid` : 'Marked as failed', a.act === 'yes' ? 'check' : 'info');
  }
  if (kind === 'bill' && a.act === 'paid') {
    const t = new Date(), ym = t.getFullYear() * 100 + t.getMonth();
    const b = (store.data.bills || []).find(x => x.pa === id); if (b) { b.paidYm = ym; store.save(); hooks.toast && hooks.toast(`${esc(b.name)} marked paid`, 'check'); }
  }
  hooks.onChange && hooks.onChange();
  reschedule(500);
}

/* ================================================================== permission status + friendly prompt */
let status = null;
export async function refreshStatus() {
  const P = X(); if (!P) { status = null; return null; }
  try { status = await P.notifStatus(); } catch (e) { status = null; }
  const el = $('#notifStatusRow'); if (el) el.outerHTML = statusRow();
  return status;
}
export function statusRow() {
  if (!X()) return `<div class="row" id="notifStatusRow"><div class="lbl"><b>Notifications</b><small>Work in the Android app</small></div></div>`;
  const on = status && status.enabled;
  return `<div class="row col" id="notifStatusRow"><div class="lbl"><b>${on ? '✅ Notifications are allowed' : '🔕 Notifications are off'}</b><small>${on ? 'Vedverse can remind you. Change sound, pop-up and lock screen in Android settings too.' : 'Optional. Allow them to get reminders, nudges and bill alerts. Vedverse works fine without them.'}</small></div>
    <div class="btn-row mt">${on ? '' : `<button class="btn primary press" data-act="notif-allow">${icon('check')} Allow</button>`}<button class="btn press" data-act="notif-settings">${icon('gear')} Android settings</button><button class="btn press" data-act="notif-test">${icon('bolt')} Test</button></div></div>`;
}
export async function allow() {
  const P = X(); if (!P) return false;
  let r = null; try { r = await P.notifyPermission(); } catch (e) {}
  await refreshStatus();
  if (!(status && status.enabled)) {
    hooks.toast && hooks.toast('Turn on “Show notifications” for Vedverse', 'info', 3500);
    try { await P.openNotifSettings(); } catch (e) {}
    return false;
  }
  hooks.toast && hooks.toast('Notifications on ✓', 'check');
  scheduleNow();
  return !!(r && r.granted);
}
export async function test() {
  const P = X(); if (!P) { hooks.toast && hooks.toast('Notifications work in the Android app', 'info'); return; }
  await refreshStatus();
  if (!(status && status.enabled)) { allow(); return; }
  const st = stats(), o = { id: 2999, ...msg('test'), url: 'vedverse://settings', emoji: (TONES[store.s.notifTone] || TONES.friendly).em, actions: [{ act: 'snooze', label: 'Snooze 1h' }, { act: 'url', label: 'Open', url: 'vedverse://home' }] };
  if (store.s.notifRich) o.image = chartImage('Last 7 days', daily(7).map(x => x.v), `${M(st.week)} this week`);
  try { await P.show(style(o, 'test')); hooks.toast && hooks.toast('Sent. Pull down your notification shade', 'check'); } catch (e) { hooks.toast && hooks.toast('Couldn’t send', 'alert'); }
}
function prompt() {
  const { openSheet } = hooks; if (!openSheet) return;
  store.data.notifAsked = Date.now(); store.save();
  openSheet(`<div class="sheet-head"><h3>Stay in the loop?</h3></div>
    <div class="np-hero">${icon('alert')}</div>
    <p class="sub" style="text-align:center;margin:6px 8px 14px">One tap turns on everything: bill reminders, budget alerts, “did it go through?” follow-ups, goal milestones and weekly summaries, in the tone you pick. <b>It’s optional</b>: everything works without notifications, and you can change this any time in Settings → Notifications.</p>
    <div class="np-list"><div>🧾 Bill reminders with <b>Pay now</b></div><div>⏳ “Did that payment go through?”</div><div>🎯 Goal and budget milestones</div><div>🌙 Quiet hours, so nothing at night</div></div>
    <div class="btn-row mt"><button class="btn press" id="npLater">Not now</button><button class="btn primary press" id="npAllow">${icon('check')} Allow</button></div>`, {
    key: 'notif-ask',
    onMount: (el, close) => {
      $('#npLater', el).onclick = () => close();
      $('#npAllow', el).onclick = async () => { close(); const ok = await allow(); if (ok || (status && status.enabled)) { ALL_ON.forEach(k => { store.s[k] = true; }); store.save(); scheduleNow(); } };
    },
  });
}

// one Allow turns on every useful reminder and nudge at once (each can be turned off later)
const ALL_ON = ['remindBills', 'budgetAlerts', 'weeklyDigest', 'nudgeMonthEnd', 'nudgePending', 'nudgeLimit', 'nudgeStreak', 'nudgeNoSpend', 'nudgeGoal', 'nudgeRecurring'];

/* ================================================================== Notification Studio (custom reminders) */
const EMOJIS = ['⏰', '💡', '🧾', '💸', '🎯', '🛒', '☕', '🍱', '🚌', '📚', '💊', '🏋️', '🎁', '📱', '🌙', '✨'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function openNotifStudio() {
  const { openSheet, toast, haptic } = hooks; if (!openSheet) return;
  let draft = null;
  const listHTML = () => {
    const L = store.data.reminders || [];
    return L.length ? L.map((r, i) => `<div class="ns-item"><span class="ns-em">${esc(r.emoji || '⏰')}</span><div class="grow"><b>${esc(r.title || 'Reminder')}</b><small>${REPEAT[r.repeat] || 'Daily'}${r.repeat === 'weekly' ? ' · ' + WD[+r.wd || 0] : r.repeat === 'monthly' ? ' · day ' + (r.md || 1) : r.repeat === 'once' ? ' · ' + esc(r.date || '') : ''} · ${esc(r.time || '09:00')} · opens ${OPENS[r.url] || 'Home'}</small></div>
      <button class="chip" data-nsedit="${i}">Edit</button><div class="sw ${r.on !== false ? 'on' : ''}" data-nson="${i}"></div></div>`).join('')
      : `<div class="empty" style="padding:18px 8px">No reminders yet.<br><small class="muted">Rent, recharge, SIP, gym fees, anything.</small></div>`;
  };
  const formHTML = d => `<div class="ns-form glass">
      <div class="ns-ems">${EMOJIS.map(e => `<button class="ns-e ${d.emoji === e ? 'on' : ''}" data-nse="${e}">${e}</button>`).join('')}</div>
      <input class="field mt" id="nsTitle" placeholder="Title (e.g. Mobile recharge)" maxlength="60" value="${esc(d.title)}">
      <input class="field mt" id="nsBody" placeholder="Message (optional)" maxlength="140" value="${esc(d.body)}">
      <div class="form-row mt"><label>Time</label><input class="field" type="time" id="nsTime" value="${esc(d.time)}" style="flex:0 0 130px"></div>
      <div class="w-chips mt">${Object.entries(REPEAT).map(([k, l]) => `<button class="chip ${d.repeat === k ? 'on' : ''}" data-nsr="${k}">${l}</button>`).join('')}</div>
      ${d.repeat === 'once' ? `<div class="form-row mt"><label>Date</label><input class="field" type="date" id="nsDate" value="${esc(d.date)}" style="flex:0 0 170px"></div>` : ''}
      ${d.repeat === 'weekly' ? `<div class="w-chips mt">${WD.map((w, i) => `<button class="chip ${+d.wd === i ? 'on' : ''}" data-nswd="${i}">${w}</button>`).join('')}</div>` : ''}
      ${d.repeat === 'monthly' ? `<div class="form-row mt"><label>Day of month</label><input class="field" type="number" min="1" max="31" id="nsMd" value="${+d.md || 1}" style="flex:0 0 90px"></div>` : ''}
      <div class="form-row mt"><label>Tap opens</label></div><div class="w-chips">${Object.entries(OPENS).map(([u, l]) => `<button class="chip ${d.url === u ? 'on' : ''}" data-nsu="${u}">${l}</button>`).join('')}</div>
      <div class="btn-row mt">${d.idx != null ? `<button class="btn danger press" id="nsDel">${icon('trash')}</button>` : ''}<button class="btn press" id="nsTest">${icon('bolt')} Test</button><button class="btn primary press" id="nsSave">${icon('check')} Save</button></div></div>`;
  openSheet(`<div class="sheet-head"><h3>Notification Studio</h3></div>
    <p class="sub" style="margin:0 0 12px">Your own reminders, any time, any repeat. They always arrive, even in quiet hours.</p>
    <div id="nsBody0"></div>`, {
    tall: true, key: 'nstudio',
    onMount: (el) => {
      const box = $('#nsBody0', el);
      const read = () => { if (!draft) return; const g = id => $('#' + id, el); draft.title = g('nsTitle') ? g('nsTitle').value.trim() : draft.title; draft.body = g('nsBody') ? g('nsBody').value.trim() : draft.body; if (g('nsTime')) draft.time = g('nsTime').value || '09:00'; if (g('nsDate')) draft.date = g('nsDate').value; if (g('nsMd')) draft.md = Math.max(1, Math.min(31, +g('nsMd').value || 1)); };
      const paint = () => { box.innerHTML = draft ? formHTML(draft) : `<div class="list glass ns-list">${listHTML()}</div><button class="btn primary press mt" id="nsNew" style="width:100%">${icon('plus')} New reminder</button>`; };
      paint();
      box.addEventListener('click', async e => {
        const t = e.target;
        if (t.closest('#nsNew')) { const d = new Date(Date.now() + 3600000); draft = { emoji: '⏰', title: '', body: '', time: `${String(d.getHours()).padStart(2, '0')}:00`, repeat: 'daily', wd: d.getDay(), md: d.getDate(), date: d.toISOString().slice(0, 10), url: 'vedverse://home', on: true }; paint(); return; }
        const ed = t.closest('[data-nsedit]'); if (ed) { const i = +ed.dataset.nsedit; draft = { ...store.data.reminders[i], idx: i }; paint(); return; }
        const sw = t.closest('[data-nson]'); if (sw) { const r = store.data.reminders[+sw.dataset.nson]; r.on = r.on === false; store.save(); sw.classList.toggle('on', r.on); haptic && haptic('tick'); reschedule(300); return; }
        if (!draft) return;
        const e1 = t.closest('[data-nse]'); if (e1) { read(); draft.emoji = e1.dataset.nse; paint(); return; }
        const r1 = t.closest('[data-nsr]'); if (r1) { read(); draft.repeat = r1.dataset.nsr; paint(); return; }
        const w1 = t.closest('[data-nswd]'); if (w1) { read(); draft.wd = +w1.dataset.nswd; paint(); return; }
        const u1 = t.closest('[data-nsu]'); if (u1) { read(); draft.url = u1.dataset.nsu; paint(); return; }
        if (t.closest('#nsTest')) { read(); const P = X(); if (!P) { toast('Works in the Android app', 'info'); return; } await refreshStatus(); if (!(status && status.enabled)) { allow(); return; }
          P.show(style({ id: 2998, title: draft.title || 'Reminder', body: draft.body || '', emoji: draft.emoji, url: draft.url, actions: [{ act: 'snooze', label: 'Snooze 1h' }] }, 'custom')); toast('Sent', 'check', 1200); return; }
        if (t.closest('#nsDel')) { store.data.reminders.splice(draft.idx, 1); store.save(); draft = null; paint(); reschedule(300); toast('Deleted', 'trash', 1200); return; }
        if (t.closest('#nsSave')) {
          read(); if (!draft.title) { toast('Give it a title', 'info'); return; }
          const { idx, ...r } = draft; const L = store.data.reminders || (store.data.reminders = []);
          if (idx != null) L[idx] = r; else { if (L.length >= 14) { toast('Up to 14 reminders', 'info'); return; } L.push(r); }
          store.save(); draft = null; paint(); reschedule(300); haptic && haptic('success'); toast('Reminder saved', 'check', 1400);
          refreshStatus().then(s => { if (s && !s.enabled) allow(); });
        }
      });
    },
  });
}

/* ================================================================== settings rows (the Notifications page) */
export function settingsRows() {
  const tones = Object.fromEntries(Object.entries(TONES).map(([k, t]) => [k, `${t.em} ${t.name}`]));
  return [
    { t: 'notifstatus' },
    { t: 'btn', label: 'Notification Studio', sub: 'Make your own reminders: title, emoji, time, repeat, what it opens', act: 'nstudio' },
    { t: 'h', label: 'Tone & style' },
    { k: 'notifTone', t: 'chips', label: 'Tone', sub: 'How Vedverse talks to you', opts: tones },
    { k: 'notifSound', t: 'seg', label: 'Sound', opts: { chime: '🌌 Chime', default: 'Phone', silent: 'Silent' } },
    { k: 'notifVib', t: 'seg', label: 'Vibration', opts: { soft: 'Soft', strong: 'Strong', pulse: 'Pulse', off: 'Off' } },
    { k: 'notifHeads', t: 'toggle', label: 'Pop-up on screen', sub: 'Heads-up banners (bills always pop up)' },
    { k: 'notifColor', t: 'color', label: 'Notification colour', sub: 'Defaults to your accent' },
    { k: 'notifRich', t: 'toggle', label: 'Rich notifications', sub: 'Weekly and month-end summaries come with a chart' },
    { k: 'notifActions', t: 'toggle', label: 'Action buttons', sub: 'Pay now · Mark paid · Snooze · Yes/No' },
    { k: 'notifPrivate', t: 'toggle', label: 'Hide amounts on lock screen', sub: 'Shows “You have a new reminder” until unlocked' },
    { t: 'h', label: 'Calm' },
    { k: 'notifQuiet', t: 'toggle', label: 'Quiet hours', sub: 'Nudges wait until morning (your own reminders still come)' },
    { k: 'quietFrom', t: 'slider', label: 'Quiet from', min: 18, max: 24, step: 1, unit: ':00' },
    { k: 'quietTo', t: 'slider', label: 'Quiet until', min: 4, max: 11, step: 1, unit: ':00' },
    { k: 'notifMax', t: 'slider', label: 'Max nudges per day', min: 1, max: 10, step: 1, unit: '' },
    { t: 'h', label: 'Reminders' },
    { k: 'remindBills', t: 'toggle', label: 'Bill reminders', sub: 'Day before + due day, with Pay now' },
    { k: 'remindHour', t: 'slider', label: 'Reminder time', min: 6, max: 22, step: 1, unit: ':00' },
    { k: 'weeklyDigest', t: 'toggle', label: 'Weekly digest', sub: 'Sunday 7 pm summary' },
    { k: 'nudgeMonthEnd', t: 'toggle', label: 'Month-end summary', sub: 'Last day of the month, 8 pm' },
    { k: 'nudgeCheckin', t: 'toggle', label: 'Daily check-in', sub: 'A short evening note with today’s total' },
    { k: 'checkinHour', t: 'slider', label: 'Check-in time', min: 17, max: 23, step: 1, unit: ':00' },
    { k: 'nudgePayday', t: 'toggle', label: 'Payday reminder', sub: 'Save for your goal first' },
    { k: 'paydayDay', t: 'slider', label: 'Payday (day of month)', min: 1, max: 28, step: 1, unit: '' },
    { t: 'h', label: 'Smart nudges' },
    { k: 'budgetAlerts', t: 'toggle', label: 'Budget alerts', sub: 'At 80% and 100% of your monthly budget' },
    { k: 'nudgeLimit', t: 'toggle', label: 'Over today’s limit', sub: 'When today passes your daily budget' },
    { k: 'nudgeStreak', t: 'toggle', label: 'Overspending streak', sub: '3 days in a row over the daily plan' },
    { k: 'nudgeNoSpend', t: 'toggle', label: 'No-spend day celebration', sub: '9:30 pm on days you spent nothing' },
    { k: 'nudgeGoal', t: 'toggle', label: 'Goal milestones', sub: '25%, 50%, 75% and 100% saved' },
    { k: 'nudgePending', t: 'toggle', label: 'Pending payment follow-up', sub: '“Did it go through?” with Yes / No buttons' },
    { k: 'nudgeRecurring', t: 'toggle', label: 'Recurring payment tips', sub: 'Spots monthly payments and suggests a bill' },
    { k: 'nudgeFestival', t: 'toggle', label: 'Festival greetings', sub: 'Diwali, Holi, Eid, Independence Day…' },
    { t: 'h', label: 'Notification shade' },
    { k: 'quickBar', t: 'toggle', label: 'Quick bar', sub: 'A silent, always-there Scan · Receive · Pay bar' },
  ];
}
export const NOTIF_KEYS = new Set(settingsRows().filter(r => r.k).map(r => r.k));

/* ================================================================== toggles + init */
export async function onNotifSetting(k, v) {
  const P = X();
  if (k === 'quickBar') { if (P) { if (v) { await refreshStatus(); if (!(status && status.enabled)) await allow(); } try { await P.quickBar({ on: !!v }); } catch (e) {} } else if (v) hooks.toast && hooks.toast('Works in the Android app', 'info'); return; }
  if (v && P && k !== 'notifTone' && typeof v === 'boolean') { await refreshStatus(); if (!(status && status.enabled)) allow(); }
  reschedule(600);
}
export async function initNotify(ctx) {
  hooks = ctx;
  const P = X();
  store.on(() => { reschedule(); live(); });
  if (!P) return;
  try { (await P.takeActions()).items.forEach(onAction); } catch (e) {}
  try { P.addListener('notifAction', a => { onAction(a); P.takeActions().catch(() => {}); }); } catch (e) {}
  await refreshStatus();
  if (store.s.quickBar && status && status.enabled) { try { P.quickBar({ on: true }); } catch (e) {} }
  scheduleNow(); live();
  // friendly, optional ask — once, a few seconds after launch, only if notifications are off
  if (!store.data.notifAsked && !(status && status.enabled)) {
    let tries = 0;
    const tryAsk = () => { if (store.data.notifAsked) return; if (!$('#sheets .sheet-wrap') && $('#scanner').hidden && $('#lock').hidden && !document.querySelector('.pay')) prompt(); else if (++tries < 40) setTimeout(tryAsk, 3000); };
    setTimeout(tryAsk, 1200);
  }
}
export function onResume() { refreshStatus(); const P = X(); if (P) P.takeActions().then(r => r.items.forEach(onAction)).catch(() => {}); }

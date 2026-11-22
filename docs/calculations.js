// Date, recurrence and money calculations shared by the budget screens.
const pad = n => String(n).padStart(2, "0");
const mi = m => { const [y, mo] = m.split("-").map(Number); return y * 12 + mo - 1; };
const mk = i => Math.floor(i / 12) + "-" + pad(i % 12 + 1);
const daysIn = m => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const REPEATS = {
  once: ["Just once", 0], weekly: ["Every week"], biweekly: ["Every 2 weeks"],
  monthly: ["Every month", 1], bimonthly: ["Every 2 months", 2], quarterly: ["Every 3 months", 3],
  half: ["Every 6 months", 6], yearly: ["Every year", 12],
};
const repeatDays = repeat => repeat === "weekly" ? 7 : repeat === "biweekly" ? 14 : 0;
// Use UTC calendar days so a clock change never shifts a scheduled date.
const DAY_MS = 86400000;
const calendarDay = (month, day = 1) => Date.parse(`${month}-${pad(day)}T00:00:00Z`) / DAY_MS;
const dateFromDay = day => new Date(day * DAY_MS).toISOString().slice(0, 10);
const onCadence = (anchor, earliest, step) => anchor + Math.ceil((earliest - anchor) / step) * step;

function weeklyDates(e, m) {
  const step = repeatDays(e.repeat);
  if (!step || !e.start || m < e.start || (e.until && m > e.until)) return [];
  const anchor = calendarDay(e.start, e.due || 1);
  const first = onCadence(anchor, Math.max(anchor, calendarDay(m)), step);
  const last = calendarDay(m, daysIn(m));
  const dates = [];
  for (let day = first; day <= last; day += step) dates.push(dateFromDay(day));
  return dates;
}

function occurs(e, m) {
  if (!e.start) return false;
  const a = mi(e.start), x = mi(m);
  if (x < a || (e.until && x > mi(e.until))) return false;
  if (repeatDays(e.repeat)) return weeklyDates(e, m).length > 0;
  const step = (REPEATS[e.repeat] || REPEATS.once)[1];
  return step ? (x - a) % step === 0 : x === a;
}
// how much to put aside each month from `from` to `by` (both included) to reach `total` — rounded UP to the cent so it's enough
function perMonth(total, from, by) { const n = mi(by) - mi(from) + 1; return n > 0 ? Math.ceil(Math.round(total * 100) / n) / 100 : null; }
function backfillStart(e, from) { const step = REPEATS[e.repeat]?.[1] || 1; return mk(mi(e.start) - Math.floor((mi(e.start) - mi(from)) / step) * step); }
function backfillSchedule(e, from) {
  const step = repeatDays(e.repeat);
  if (!step) return { start: backfillStart(e, from), due: e.due ?? null };
  const date = dateFromDay(onCadence(calendarDay(e.start, e.due || 1), calendarDay(from), step));
  return { start: date.slice(0, 7), due: Number(date.slice(8)) };
}

function scheduledItems(e, m) {
  if (repeatDays(e.repeat)) return weeklyDates(e, m).map(date => ({
    ...e, due: Number(date.slice(8)), date, paymentKey: `${e.id}:${date}`,
  }));
  return occurs(e, m) ? [{ ...e, paymentKey: e.id }] : [];
}

function makeBudgetCalculations({ state, budget, category, today, thisMonth }) {
  function num(v) {
    if (typeof v === "number") return isFinite(v) ? Math.round(v * 100) / 100 : 0;
    let s = String(v ?? "").replace(/[\s €$£]/g, "");
    // the budget's number style decides what a lone "," or "." means: "dot" = 1.234,56 (default), "comma" = 1,234.56
    const style = budget()?.numStyle || "dot";
    const group = style === "comma" ? "," : ".", groupsOnly = style === "comma" ? /^-?\d{1,3}(,\d{3})+$/ : /^-?\d{1,3}(\.\d{3})+$/;
    if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (groupsOnly.test(s)) s = s.split(group).join("");   // 1.000 / 12.500 in dot style
    else if (s.includes(",") || s.includes(".")) { const parts = s.split(/[.,]/); const last = parts.pop(); s = parts.join("") + "." + last; }   // anything else: the last mark is the decimal point
    const n = parseFloat(s); return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  const cents = v => Math.round(num(v) * 100);
  const r2 = v => Math.round(v * 100) / 100;                                     // tidy a euro value to whole cents
  const sum = (a, f = x => x) => a.reduce((s, x) => s + Math.round(f(x) * 100), 0) / 100;   // exact: adds whole cents

  function autoPaid(e, m) {
    const cur = thisMonth();
    if (m < cur) return true;
    if (m > cur) return false;
    return today().getDate() >= (e.due || 1);
  }
  function monthItems(m) {
    const md = state.months[m] || {};
    return state.entries.flatMap(e => scheduledItems(e, m)).map(e => {
      const over = md.amounts?.[e.id];
      const explicit = md.paid?.[e.paymentKey];
      return { ...e, base: num(e.amount), amt: over != null ? num(over) : num(e.amount), changed: over != null,
        skipped: !!md.skip?.[e.id], paid: e.type === "bill" ? (explicit != null ? !!explicit : (e.auto ? autoPaid(e, m) : false)) : true };
    });
  }
  function goalMoves(m) { const out = []; for (const g of state.goals) for (const d of (g.moves || [])) if ((d.d || "").startsWith(m)) out.push({ ...d, goal: g }); return out; }
  function firstMonth() {
    let f = null;
    for (const e of state.entries) if (e.start && (!f || e.start < f)) f = e.start;
    for (const g of state.goals) for (const d of (g.moves || [])) { const m = (d.d || "").slice(0, 7); if (m && (!f || m < f)) f = m; }
    return f;
  }
  const carryCache = new Map();
  function totals(m) {
    const items = monthItems(m).filter(i => !i.skipped);
    const income = sum(items.filter(i => i.type === "income"), i => i.amt);
    const billsAll = items.filter(i => i.type === "bill");
    const bills = sum(billsAll, i => i.amt);
    const unpaidList = billsAll.filter(i => !i.paid);
    const unpaid = sum(unpaidList, i => i.amt);
    const spend = sum(items.filter(i => i.type === "spend"), i => i.amt);
    const saved = sum(goalMoves(m), d => num(d.a));
    const carry = budget()?.carry ? carryIn(m) : 0;
    const afterBills = (cents(income) + cents(carry) - cents(bills)) / 100;
    const left = (cents(afterBills) - cents(spend) - cents(saved)) / 100;
    return { income, bills, unpaid, unpaidCount: unpaidList.length, billCount: billsAll.length, spend, saved, carry, afterBills, left, out: (cents(bills) + cents(spend)) / 100 };
  }
  function carryIn(m) {
    const key = m + "|" + state.dataStamp;
    if (carryCache.has(key)) return carryCache.get(key);
    const f = firstMonth();
    let c = 0;
    if (f && f < m) {
      const start = Math.max(mi(f), mi(m) - 240);
      for (let i = start; i < mi(m); i++) {
        const items = monthItems(mk(i)).filter(x => !x.skipped);
        c += cents(sum(items, x => x.type === "income" ? x.amt : -x.amt)) - cents(sum(goalMoves(mk(i)), d => num(d.a)));
      }
    }
    carryCache.set(key, c / 100);
    return c / 100;
  }
  // spending limits per category: { catId: { limit, used, paidPart } }
  function limitsFor(m) {
    const L = budget()?.limits || {};
    const items = monthItems(m).filter(i => !i.skipped && i.type !== "income");
    return Object.entries(L).filter(([, v]) => num(v) > 0).map(([id, v]) => {
      const its = items.filter(i => i.category === id);
      const used = sum(its, i => i.amt), done = sum(its.filter(i => i.paid), i => i.amt);
      return { id, c: category(id), limit: num(v), used, done };
    }).sort((a, b) => b.used / b.limit - a.used / a.limit);
  }
  // what can still be spent per day for the rest of this month (null for other months)
  function safeToSpend(m) {
    if (m !== thisMonth()) return null;
    const days = daysIn(m) - today().getDate() + 1;
    return { perDay: r2(Math.max(0, totals(m).left) / days), days };
  }
  // bills + spending per category in a month (skipped items left out)
  function outByCat(m) { const o = {}; for (const i of monthItems(m)) if (!i.skipped && i.type !== "income") o[i.category] = r2((o[i.category] || 0) + i.amt); return o; }
  // month-end forecast (this month only): what is likely left once the usual spending for the rest of the month happens.
  // "usual" = average spending of the last 3 months that had any; with no history, this month's daily pace is used.
  function forecast(m) {
    if (m !== thisMonth()) return null;
    const t = totals(m), day = today().getDate(), restDays = daysIn(m) - day;
    const prev = [1, 2, 3].map(k => totals(mk(mi(m) - k)).spend).filter(v => v > 0);
    const usual = prev.length ? r2(sum(prev) / prev.length) : null;
    const more = r2(Math.max(0, usual != null ? usual - t.spend : t.spend / day * restDays));
    return { income: t.income, carry: t.carry, bills: t.bills, unpaid: t.unpaid, spent: t.spend, saved: t.saved, more, usual, restDays, end: r2(t.left - more) };
  }

  // every bill in a calendar year: how often, which months, and its total (one-month changes and skips included)
  function billsPlan(year) {
    const map = {};
    for (let i = 1; i <= 12; i++) {
      const m = year + "-" + pad(i);
      for (const it of monthItems(m)) if (it.type === "bill" && !it.skipped) {
        const o = (map[it.id] ||= { id: it.id, name: it.name, category: it.category, repeat: it.repeat || "once", count: 0, total: 0, months: [] });
        o.count++; o.total = r2(o.total + it.amt);
        if (o.months.at(-1) !== i) o.months.push(i);
      }
    }
    const items = Object.values(map).sort((a, z) => z.total - a.total);
    return { items, total: sum(items, x => x.total) };
  }

  function goalSaved(g) { return sum(g.moves || [], d => num(d.a)); }
  // net money into a goal per month, oldest first: [{ m, v }]
  function goalMonths(g, n = 6) { const end = mi(thisMonth()); return Array.from({ length: n }, (_, k) => { const m = mk(end - n + 1 + k); return { m, v: sum((g.moves || []).filter(d => (d.d || "").startsWith(m)), d => num(d.a)) }; }); }

  return {
    num, r2, sum, monthItems, goalMoves, firstMonth, totals, carryIn,
    limitsFor, safeToSpend, outByCat, forecast, billsPlan, goalSaved, goalMonths,
    clearCarryCache: () => carryCache.clear(),
  };
}

// Runs inside the app page (demo copy, no Firebase). Every check compares the app's own functions
// against numbers worked out by hand. Returns [{ name, ok, got, want }].
const results = [];
const eq = (got, want) => JSON.stringify(got) === JSON.stringify(want);
const check = (name, got, want) => results.push({ name, ok: eq(got, want), got, want });
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- a fixed, hand-checked household ---------- */
const E = o => ({ repeat: "monthly", start: "2026-01", until: null, due: null, auto: false, note: "", category: "c4", by: "local", createdAt: 1, ...o });
const FIX = {
  entries: [
    E({ id: "inc", type: "income", name: "Salary", amount: 2400, category: "c0" }),
    E({ id: "q", type: "income", name: "Bonus", amount: 180, repeat: "quarterly", start: "2026-02", category: "c3" }),
    E({ id: "rent", type: "bill", name: "Rent", amount: 650, due: 1 }),
    E({ id: "elec", type: "bill", name: "Electricity", amount: 85.4, due: 12, auto: true, category: "c5" }),
    E({ id: "water", type: "bill", name: "Water", amount: 38.1, due: 15, repeat: "bimonthly", start: "2025-11", category: "c5" }),
    E({ id: "ins", type: "bill", name: "Insurance", amount: 420, due: 28, repeat: "yearly", start: "2025-05", category: "c7" }),
    E({ id: "loan", type: "bill", name: "Loan", amount: 210, due: 5, until: "2026-06", category: "c13" }),
    E({ id: "s1", type: "spend", name: "Sweets", amount: 0.1, repeat: "once", start: "2026-11", due: 3, category: "c9" }),
    E({ id: "s2", type: "spend", name: "Gum", amount: 0.2, repeat: "once", start: "2026-11", category: "c9" }),
    E({ id: "s3", type: "spend", name: "Shop", amount: 19.99, repeat: "once", start: "2026-11", category: "c9" }),
  ],
  months: {
    "2026-11": { paid: { rent: true } },
    "2026-10": { amounts: { rent: 700 }, paid: { rent: true, water: true, loan: true } },
    "2026-09": { skip: { inc: true } },
  },
  goals: [{ id: "g1", name: "Holiday", target: 1000, moves: [{ k: "a", d: "2026-10-02", a: 100 }, { k: "b", d: "2026-11-02", a: 150 }, { k: "c", d: "2026-11-20", a: -50 }] }],
};
const load = (fix, budget = {}) => {
  S.budgets = [{ id: "fx", name: "Test", kind: "personal", owner: "local", members: ["local"], currency: "EUR", numStyle: "dot", categories: DEFAULT_CATS, ...budget }];
  S.bid = "fx"; S.entries = JSON.parse(JSON.stringify(fix.entries)); S.months = JSON.parse(JSON.stringify(fix.months)); S.goals = JSON.parse(JSON.stringify(fix.goals));
  S.dataStamp++; carryCache.clear();
};
unsubBudget && unsubBudget(); unsubBudget = null;
NOW = "2026-11-22";
load(FIX);

/* ---------- parsing amounts ---------- */
check("parse 1.234,56", num("1.234,56"), 1234.56);
check("parse 1,234.56", num("1,234.56"), 1234.56);
check("parse 12,5", num("12,5"), 12.5);
check("parse € 7", num("€ 7"), 7);
check("parse 1.000,00", num("1.000,00"), 1000);
check("parse 1.000 = one thousand (dot style)", num("1.000"), 1000);
check("parse 12.500 = twelve thousand five hundred", num("12.500"), 12500);
check("parse 12.5 = twelve and a half", num("12.5"), 12.5);
check("parse 1,5", num("1,5"), 1.5);
check("parse -20,50 (refund)", num("-20,50"), -20.5);
check("parse rubbish = 0", num("abc"), 0);
check("parse rounds to cents", num("3,14159"), 3.14);
check("ten times 0,10 is exactly 1", sum(Array(10).fill(0.1)), 1);
check("0,10 + 0,20 is exactly 0,30", sum([0.1, 0.2]), 0.3);

/* ---------- repeating rules ---------- */
const ent = id => S.entries.find(e => e.id === id);
check("monthly shows every month", ["2026-01", "2026-06", "2026-12"].map(m => occurs(ent("inc"), m)), [true, true, true]);
check("nothing before the start", occurs(ent("inc"), "2025-12"), false);
check("every 2 months across the new year", ["2025-11", "2025-12", "2026-01", "2026-02", "2026-11"].map(m => occurs(ent("water"), m)), [true, false, true, false, true]);
check("every 3 months", ["2026-02", "2026-03", "2026-05", "2026-11", "2026-12"].map(m => occurs(ent("q"), m)), [true, false, true, true, false]);
check("yearly", ["2025-05", "2026-04", "2026-05", "2027-05"].map(m => occurs(ent("ins"), m)), [true, false, true, true]);
check("stops after its last month", ["2026-06", "2026-07"].map(m => occurs(ent("loan"), m)), [true, false]);
check("just once", ["2026-10", "2026-11", "2026-12"].map(m => occurs(ent("s1"), m)), [false, true, false]);

/* ---------- November 2026 (today = 22 Nov) ---------- */
const t = totals("2026-11");
check("Nov income (salary + quarterly bonus)", t.income, 2580);
check("Nov bills (rent + electricity + water)", t.bills, 773.5);
check("Nov spending 0,10 + 0,20 + 19,99", t.spend, 20.29);
check("Nov into savings (150 in, 50 out)", t.saved, 100);
check("Nov left after bills", t.afterBills, 1806.5);
check("Nov left after everything", t.left, 1686.21);
check("Nov going out", t.out, 793.79);
check("Nov still to pay = water only (rent ticked, electricity autopaid)", [t.unpaid, t.unpaidCount, t.billCount], [38.1, 1, 3]);
check("safe to spend on 22 Nov", safeToSpend("2026-11"), { perDay: 187.36, days: 9 });
check("water overdue text", dueText(monthItems("2026-11").find(i => i.id === "water"), "2026-11"), "7 days late");

/* ---------- autopay timing ---------- */
NOW = "2026-11-11"; check("autopay not ticked before its day", monthItems("2026-11").find(i => i.id === "elec").paid, false);
NOW = "2026-11-12"; check("autopay ticks on its day", monthItems("2026-11").find(i => i.id === "elec").paid, true);
NOW = "2026-11-22";
check("autopay ticked in past months", monthItems("2026-10").find(i => i.id === "elec").paid, true);
check("autopay not ticked in future months", monthItems("2026-12").find(i => i.id === "elec").paid, false);
S.months["2026-11"].paid.elec = false;
check("unticking an autopay bill sticks", monthItems("2026-11").find(i => i.id === "elec").paid, false);
delete S.months["2026-11"].paid.elec;

/* ---------- one month only: changed amount, skip ---------- */
const oct = totals("2026-10");
check("Oct rent changed to 700 just that month", monthItems("2026-10").find(i => i.id === "rent").amt, 700);
check("Nov rent still 650", monthItems("2026-11").find(i => i.id === "rent").amt, 650);
check("Oct bills: rent 700 (changed) + electricity 85,40", oct.bills, 785.4);
check("Sep salary skipped", totals("2026-09").income, 0);
check("Oct saved", oct.saved, 100);

/* ---------- safe to spend: month ends, February, leap year ---------- */
NOW = "2026-11-30"; check("safe to spend on the last day = 1 day", safeToSpend("2026-11").days, 1);
NOW = "2027-02-01"; check("February 2027 has 28 days", safeToSpend("2027-02").days, 28);
check("2028 is a leap year", daysIn("2028-02"), 29);
check("no safe-to-spend for other months", safeToSpend("2026-11"), null);
NOW = "2026-11-22";

/* ---------- year ---------- */
const yi = sum(Array.from({ length: 12 }, (_, i) => totals("2026-" + pad(i + 1)).income), x => x);
check("2026 income: 12 × 2400 + 4 × 180 − skipped Sep", yi, 27120);
check("year view compares only with a full previous year", (() => { const fm = firstMonth(); return !!(fm && fm <= "2026-01"); })(), true);

/* ---------- carry-over ---------- */
load(FIX, { carry: true });
check("carried into Feb 2026 (May 25 insurance −420, Nov 25 water −38,10, Jan +1416,50)", carryIn("2026-02"), 958.4);
check("Feb left after bills includes the carry", totals("2026-02").afterBills, r2(958.4 + 2400 + 180 - 650 - 85.4 - 210));
load(FIX);

/* ---------- spending limits ---------- */
S.budgets[0].limits = { c9: 20, c5: 200 };
const L = limitsFor("2026-11");
check("groceries over its limit", L.find(x => x.id === "c9"), { id: "c9", c: cat("c9"), limit: 20, used: 20.29, done: 20.29 });
check("utilities: 123,50 used, water still to pay", (({ used, done }) => ({ used, done }))(L.find(x => x.id === "c5")), { used: 123.5, done: 85.4 });
delete S.budgets[0].limits;

/* ---------- forecast and insights ---------- */
check("forecast with no history uses this month's pace (20,29 in 22 days → 7,38 for the last 8)", (({ more, restDays, end, usual }) => ({ more, restDays, end, usual }))(forecast("2026-11")), { more: 7.38, restDays: 8, end: 1678.83, usual: null });
S.entries.push(E({ id: "old", type: "spend", name: "Old shop", amount: 300, repeat: "once", start: "2026-10", category: "c9" })); S.dataStamp++; carryCache.clear();
check("forecast uses the usual monthly spending when there is history", (({ more, end, usual }) => ({ more, end, usual }))(forecast("2026-11")), { more: 279.71, end: 1406.5, usual: 300 });
check("insights: groceries down, utilities up, biggest cost", insights("2026-11").map(x => x.key), ["up:c5", "down:c9", "out", "top:c4"]);
S.entries.pop(); S.dataStamp++; carryCache.clear();
check("insights: utilities up 38,10 on last month, housing biggest", insights("2026-11").map(x => x.key), ["up:c5", "top:c4"]);
check("no forecast for other months", forecast("2026-10"), null);
S.budgets[0].limits = { c9: 22 };
check("insights warn near a limit (20,29 of 22 = 92%)", insights("2026-11").some(x => x.key === "near:c9"), true);
delete S.budgets[0].limits;

/* ---------- plan for next year's bills ---------- */
const bp = billsPlan(2027);
check("2027 bills: rent 12×650, electricity 12×85,40, water 6×38,10, insurance 420 (loan has ended)", bp.items.map(x => [x.id, x.count, x.total]), [["rent", 12, 7800], ["elec", 12, 1024.8], ["ins", 1, 420], ["water", 6, 228.6]]);
check("2027 bills total", bp.total, 9473.4);
check("water comes in Jan, Mar, May, Jul, Sep, Nov", bp.items.find(x => x.id === "water").months, [1, 3, 5, 7, 9, 11]);
check("to have it all by end of Dec 2026, from Nov: 2 months", perMonth(9473.4, "2026-11", "2026-12"), 4736.7);
check("spread over 2027: ÷ 12", perMonth(9473.4, "2027-01", "2027-12"), 789.45);
check("amount per month is rounded up so it's enough (100 over 3 months)", perMonth(100, "2026-01", "2026-03"), 33.34);
check("a date in the past gives no plan", perMonth(100, "2026-11", "2026-10"), null);

/* ---------- fill in earlier months ---------- */
check("monthly fills from the chosen month", backfillStart(ent("inc"), "2025-10"), "2025-10");
check("quarterly keeps its quarters, never before the chosen month", backfillStart(ent("q"), "2025-10"), "2025-11");
check("yearly keeps its month", backfillStart(ent("ins"), "2024-01"), "2024-05");

/* ---------- money formatting ---------- */
const plain = s => s.replace(/\s/g, " ");
check("euro format 1.234,50 €", plain(money(1234.5, { raw: true })), "1.234,50 €");
check("rounded format", plain(money(1234.5, { raw: true, round: true })), "1.235 €");

/* ---------- backup → restore gives the same numbers ---------- */
const months = Array.from({ length: 20 }, (_, i) => mk(mi("2025-05") + i));
const before = months.map(m => totals(m));
const bk = JSON.parse(JSON.stringify(backupData()));
check("backup is recognised", isBackup(bk), true);
check("rubbish is not a backup", isBackup({ hello: 1 }), false);
const r = Store.createBudget({ name: "Restore test", emoji: "🧪", kind: "shared", currency: "EUR", numStyle: "dot", categories: DEFAULT_CATS, memberNames: { local: "Test" } });
await r.done; selectBudget(r.id); await wait(200);
check("new budget starts empty", S.entries.length, 0);
await restoreData(bk); await wait(300);
check("restore brings every item back", S.entries.length, FIX.entries.length);
check("restore keeps paid ticks", S.months["2026-11"]?.paid?.rent, true);
check("restored budget gives identical totals for 20 months", months.map(m => totals(m)), before);
await Store.deleteBudget(r.id);

NOW = null;
return results;

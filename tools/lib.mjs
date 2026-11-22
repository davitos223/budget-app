// Shared helpers for the screenshot script: invented demo data, a demo copy of the app
// (no sync, data in the page's own storage), a tiny static server and a headless Edge/Chrome driver.
// Needs only Node 22+ and Microsoft Edge or Google Chrome. Nothing here touches the real database.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DOCS = join(ROOT, "docs");

/* ---------- demo data (same every run; dates are relative to today) ---------- */
export function demoData() {
  let seed = 11;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const U = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
  const pad = n => String(n).padStart(2, "0");
  const now = new Date(), cy = now.getFullYear(), cm = now.getMonth(), cd = now.getDate();
  const mk = i => `${Math.floor(i / 12)}-${pad(i % 12 + 1)}`, nowI = cy * 12 + cm;
  const start = mk(nowI - 11), A = "local", Bu = "u2";
  let n = 0; const id = () => "d" + String(++n).padStart(4, "0");
  const entries = {}, months = {};
  const add = e => { const k = id(); entries[k] = { repeat: "monthly", start, until: null, due: null, auto: false, note: "", by: A, createdAt: 1, updatedAt: 1, ...e }; return k; };
  // income
  add({ type: "income", name: "Salary", amount: 2650, category: "c0" });
  add({ type: "income", name: "Salary", amount: 1980, category: "c0", by: Bu });
  add({ type: "income", name: "Side income", amount: 180, category: "c3", repeat: "quarterly", start: mk(nowI - 10) });
  // bills
  const bills = [
    ["Rent", 920, "c4", 1, true], ["Home insurance", 32, "c7", 5, true], ["Car loan", 245, "c13", 5, false, { until: mk(nowI + 9) }],
    ["Gym", 34, "c14", 3, false], ["Electricity", 96, "c5", 12, true], ["Water", 38, "c5", 15, false, { repeat: "bimonthly" }],
    ["Internet & TV", 44.9, "c6", 20, true], ["Phones", 39.98, "c6", 22, false, { by: Bu }], ["Streaming", 13.99, "c11", 24, true],
    ["Car insurance", 540, "c7", 28, false, { repeat: "yearly", start: mk(nowI - 8) }],
  ];
  const billIds = bills.map(([name, amount, category, due, auto, extra]) => [add({ type: "bill", name, amount, category, due, auto, ...(extra || {}) }), due, auto, extra]);
  // spending, month by month
  for (let i = nowI - 11; i <= nowI; i++) {
    const m = mk(i), last = i === nowI ? cd : 28;
    const spend = (name, cat, a, b, day, by) => { if (day <= last) add({ type: "spend", name, amount: U(a, b), category: cat, repeat: "once", start: m, by: by || (rnd() < .5 ? A : Bu), createdAt: Date.UTC(+m.slice(0, 4), +m.slice(5) - 1, day) }); };
    for (const d of [3, 10, 17, 24]) spend("Weekly shop", "c9", 95, 150, d);
    spend("Dinner out", "c10", 38, 72, 9); spend("Lunch", "c10", 14, 26, 19);
    spend("Fuel", "c8", 55, 72, 7); spend("Fuel", "c8", 50, 70, 21);
    if (rnd() < .5) spend("Clothes", "c15", 35, 110, 14);
    if (rnd() < .6) spend("Cinema", "c14", 18, 34, 16);
    // paid ticks: everything in past months; this month only what's due before today, except Water (overdue)
    const paid = {};
    for (const [k, due, auto] of billIds) if (!auto && (i < nowI || (due < cd && !entries[k].name.startsWith("Water")))) paid[k] = true;
    months[m] = { paid };
  }
  months[mk(nowI)].note = "Car service at the end of the month — keep about €200 aside.";
  // goals
  const goals = {};
  const goal = (name, emoji, target, by, color, from, amt) => { const moves = []; for (let i = nowI - from; i <= nowI; i++) moves.push({ k: "m" + i + name.length, d: `${mk(i)}-02`, a: amt, by: i % 2 ? A : Bu }); goals[id()] = { name, emoji, target, by, color, moves, createdAt: nowI - from }; };
  goal("Emergency fund", "🛟", 6000, null, "#14b8a6", 11, 200);
  goal("Summer holiday", "🏖️", 3000, mk(nowI + 8), "#0ea5e9", 8, 150);
  goal("New sofa", "🛋️", 1200, mk(nowI + 3), "#f59e0b", 4, 100);
  const cats = [
    ["in", "💼", "Salary"], ["in", "🏖️", "Pension"], ["in", "🎁", "Gifts & extra"], ["in", "📥", "Other income"],
    ["out", "🏠", "Housing"], ["out", "💡", "Utilities"], ["out", "📱", "Phone & internet"], ["out", "🛡️", "Insurance"],
    ["out", "🚗", "Car & transport"], ["out", "🛒", "Groceries"], ["out", "🍽️", "Eating out"], ["out", "📺", "Subscriptions"],
    ["out", "💊", "Health"], ["out", "🏦", "Loans"], ["out", "🎉", "Fun & hobbies"], ["out", "👕", "Clothes"], ["out", "📦", "Other"],
  ].map(([kind, emoji, name], i) => ({ id: "c" + i, kind, emoji, name, color: ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#f97316", "#22c55e", "#84cc16", "#06b6d4", "#a855f7", "#64748b", "#d946ef"][i % 14] }));
  const budget = { name: "Household", emoji: "🏡", kind: "shared", owner: A, members: [A, Bu], memberNames: { [A]: "Alex", [Bu]: "Sam" },
    currency: "EUR", numStyle: "dot", carry: false, categories: cats, limits: { c9: 600, c10: 140, c8: 160, c14: 80 }, createdAt: 1 };
  return { profile: { name: "Alex", look: { theme: "light", accent: "indigo", size: "normal", start: "month" } },
    budgets: { demo: budget, mine: { name: "My budget", emoji: "💰", kind: "personal", owner: A, members: [A], memberNames: { [A]: "Alex" }, currency: "EUR", numStyle: "dot", categories: cats, createdAt: 0 } },
    items: { demo: { entries, goals } }, months: { demo: months } };
}

/* ---------- demo copy of the app ---------- */
// ?seed loads the demo data (replacing whatever the page stored); &theme= &view= override the look.
export function buildDemo() {
  const dir = mkdtempSync(join(tmpdir(), "budget-demo-"));
  cpSync(join(DOCS, "icons"), join(dir, "icons"), { recursive: true });
  cpSync(join(DOCS, "manifest.webmanifest"), join(dir, "manifest.webmanifest"));
  writeFileSync(join(dir, "config.js"), "window.BUDGET_FIREBASE = null;\n");
  writeFileSync(join(dir, "cloud.js"), "// demo: no sync\n");
  const seed = `<style>.demo{display:none}</style><script>(() => { const q = new URLSearchParams(location.search); if (!q.has("seed")) return;
  const data = ${JSON.stringify(demoData())};
  if (q.get("theme")) data.profile.look.theme = q.get("theme");
  if (q.get("view")) data.profile.look.start = q.get("view");
  localStorage.clear();
  localStorage.setItem("budget.demo.v1", JSON.stringify(data));
  localStorage.setItem("budget.last.local", "demo");
  localStorage.setItem("budget.look", JSON.stringify({ theme: data.profile.look.theme, size: "normal", accentHex: "#5b5fd6" }));
})();</script>`;
  let html = readFileSync(join(DOCS, "index.html"), "utf8");
  const tag = html.match(/<script src="config\.js[^"]*"><\/script>/)[0];
  html = html.replace(tag, tag + "\n" + seed);
  writeFileSync(join(dir, "index.html"), html);
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/* ---------- static server ---------- */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
export function serve(dir) {
  return new Promise(res => {
    const srv = createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
      const f = join(dir, p);
      if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); rsp.end(readFileSync(f));
    }).listen(0, "127.0.0.1", () => res({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

/* ---------- headless browser over the DevTools protocol ---------- */
const BROWSERS = [process.env.BROWSER, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function browser() {
  const exe = BROWSERS.find(p => p && existsSync(p));
  if (!exe) throw new Error("No Edge or Chrome found. Set BROWSER to its path.");
  const profile = mkdtempSync(join(tmpdir(), "budget-browser-")), port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(exe, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--lang=en-GB",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 60 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page"); } catch {} if (!target) await sleep(250); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0; const pending = new Map(), onLoad = [], errors = [];
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Page.loadEventFired") onLoad.splice(0).forEach(f => f());
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, m => m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable"); await send("DOM.enable");
  await send("Emulation.setLocaleOverride", { locale: "en-GB" }).catch(() => {});
  const page = {
    errors,
    viewport: (width, height, deviceScaleFactor = 1, mobile = false) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile }),
    async goto(url, settle = 1200) { const loaded = new Promise(r => onLoad.push(r)); await send("Page.navigate", { url }); await loaded; await sleep(settle); },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async screenshot(file) { const r = await send("Page.captureScreenshot", { format: "png" }); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.from(r.data, "base64")); },
    async setFiles(selector, files) { const { root } = await send("DOM.getDocument"); const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector }); await send("DOM.setFileInputFiles", { nodeId, files }); },
    sleep,
    close() { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 1500); },
  };
  return page;
}

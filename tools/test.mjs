// Automated checks of the money maths, run on a demo copy of the app (never the real database):
//   node tools/test.mjs
// Needs Node 22+ and Microsoft Edge or Google Chrome.
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { ROOT, buildDemo, serve, browser } from "./lib.mjs";

const demo = buildDemo(), server = await serve(demo.dir), page = await browser();
const home = new URL("/", server.url).href;
let failed = 0;
try {
  await page.viewport(390, 844, 1, true);
  await page.goto(home + "?seed", 1500);
  await page.eval(`
    await Promise.race([
      navigator.serviceWorker.controller ? Promise.resolve() :
        new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker did not take control")), 10000)),
    ]);
  `);
  const snapshot = () => page.eval("return { version: APP_VERSION, totals: totals(S.month), budget: B().name };");
  const online = await snapshot();
  assert.equal(online.budget, "Household");

  // An updated page may arrive before its new script is available.
  const index = join(demo.dir, "index.html");
  const script = join(demo.dir, "calculations.js");
  const nextVersion = online.version + "-test-update";
  writeFileSync(index, readFileSync(index, "utf8").replaceAll(online.version, nextVersion));
  renameSync(script, script + ".saved");
  await page.goto(home);
  assert.deepEqual(await snapshot(), online);
  console.log("  ok   the previous app opens if an update's calculation file is missing");

  renameSync(script + ".saved", script);
  await page.goto(home);
  const updated = { ...online, version: nextVersion };
  assert.deepEqual(await snapshot(), updated);

  server.close();
  await page.goto(home);
  assert.deepEqual(await snapshot(), updated);
  console.log("  ok   the updated app opens offline with the same budget and totals");
  const code = readFileSync(join(ROOT, "tools", "calc-checks.js"), "utf8");
  const results = await page.eval(code);
  for (const r of results) {
    if (r.ok) console.log("  ok   " + r.name);
    else { failed++; console.log("  FAIL " + r.name + "\n         got:  " + JSON.stringify(r.got) + "\n         want: " + JSON.stringify(r.want)); }
  }
  const errs = page.errors.filter(e => !/favicon/i.test(e));
  if (errs.length) { failed++; console.log("  FAIL page errors:\n    " + errs.join("\n    ")); }
  console.log(`\n${results.length - (failed && results.filter(r => !r.ok).length)} of ${results.length} checks passed${failed ? ` — ${failed} FAILED` : " ✓"}`);
} finally { page.close(); server.close(); demo.cleanup(); }
process.exit(failed ? 1 : 0);

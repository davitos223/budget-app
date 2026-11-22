// Automated checks of the money maths, run on a demo copy of the app (never the real database):
//   node tools/test.mjs
// Needs Node 22+ and Microsoft Edge or Google Chrome.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, buildDemo, serve, browser } from "./lib.mjs";

const demo = buildDemo(), server = await serve(demo.dir), page = await browser();
let failed = 0;
try {
  await page.viewport(390, 844, 1, true);
  await page.goto(server.url, 1500);
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

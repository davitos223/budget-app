// How long does one full redraw take with the demo household? (demo copy, no Firebase)
import { buildDemo, serve, browser } from "./lib.mjs";
const demo = buildDemo(), server = await serve(demo.dir), page = await browser();
try {
  await page.viewport(1440, 900, 1, false);
  await page.goto(server.url + "?seed", 1500);
  const r = await page.eval(`const out = {};
    for (const [v, sub] of [["month", "summary"], ["month", "details"], ["year", "summary"], ["goals", "summary"]]) {
      S.view = v; S.sub = sub; _render();
      const t0 = performance.now(); for (let i = 0; i < 20; i++) { S.dataStamp++; carryCache.clear(); _render(); }
      out[v + "/" + sub] = Math.round((performance.now() - t0) / 20 * 10) / 10 + " ms";
    }
    out.entries = S.entries.length; return out;`);
  console.log(r);
} finally { page.close(); server.close(); demo.cleanup(); }

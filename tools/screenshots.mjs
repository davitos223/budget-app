// Remakes the README screenshots from a demo copy with invented data (never the real database):
//   node tools/screenshots.mjs            all of them
//   node tools/screenshots.mjs phone-add  just the ones named
import { join } from "node:path";
import { ROOT, buildDemo, serve, browser } from "./lib.mjs";

const PHONE = [390, 844, 3, true], DESK = [1440, 900, 2, false];
const scrollTo = sel => `const p = document.querySelector("${sel}"); scrollTo(0, p.getBoundingClientRect().top + scrollY - 12);`;
const SHOTS = {
  "phone-home": [PHONE, ""],
  "phone-bills": [PHONE, "", `S.sub = "details"; _render(); await new Promise(r => setTimeout(r, 200));`],
  "phone-insights": [PHONE, "", `S.sub = "details"; _render(); const c = [...document.querySelectorAll(".ttl b")].find(x => x.textContent.includes("Insights")); scrollTo(0, c.getBoundingClientRect().top + scrollY - 90);`],
  "phone-cats": [PHONE, "", `S.sub = "details"; _render(); ${scrollTo(".limit-status")}`],
  "phone-limits": [PHONE, "", `openAllCats(); document.activeElement.blur();`],
  "phone-add": [PHONE, "", `openEntry(null, "spend"); const a = document.querySelector("#fAmt"); a.value = "42,80"; document.querySelector("#fName").value = "Farmers market"; document.activeElement.blur();`],
  "phone-goals": [PHONE, "view=goals"],
  "phone-billplan": [PHONE, "", `openBillPlan(); document.activeElement.blur(); document.querySelector(".sheet").scrollTop = 0;`],
  "phone-billplan2": [PHONE, "", `openBillPlan(); document.activeElement.blur(); const sh = document.querySelector(".sheet"); sh.scrollTop = sh.scrollHeight;`],
  "phone-dark": [PHONE, "theme=dark"],
  "phone-activity": [PHONE, "", `openActivity(); document.activeElement.blur();`],
  "phone-recent": [PHONE, "", `S.sub = "details"; _render(); const c = [...document.querySelectorAll(".ttl b")].find(x => x.textContent.includes("Recent activity")); scrollTo(0, c.getBoundingClientRect().top + scrollY - 90);`],
  "phone-goalview": [PHONE, "view=goals", `openGoalView(S.goals.find(g => g.name === "Summer holiday").id); document.activeElement.blur(); const sh = document.querySelector(".sheet"); sh.scrollTop = 260;`],
  "desktop-light": [DESK, ""],
  "desktop-dark": [DESK, "theme=dark"],
  "desktop-year": [DESK, "view=year", `scrollTo(0, 640);`],
  "desktop-month": [DESK, "", `S.sub = "details"; _render(); await new Promise(r => setTimeout(r, 200));`],
  "desktop-settings": [DESK, "view=settings"],
};

const only = process.argv.slice(2);
const demo = buildDemo(), server = await serve(demo.dir), page = await browser();
try {
  for (const [name, [vp, query, action]] of Object.entries(SHOTS)) {
    if (only.length && !only.includes(name)) continue;
    await page.viewport(...vp);
    await page.goto(server.url + "?seed&" + query, 1500);
    if (action) await page.eval(action);
    await page.sleep(900);
    await page.screenshot(join(ROOT, "screenshots", name + ".png"));
    console.log("saved screenshots/" + name + ".png");
  }
  if (page.errors.length) console.log("page errors:", page.errors);
} finally { page.close(); server.close(); demo.cleanup(); }

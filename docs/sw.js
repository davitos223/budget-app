// Network first: online you always get the newest version from GitHub; if GitHub can't be reached,
// answers with an error page, or takes more than 1.5 seconds, the last saved copy opens instead
// (and the newer version still downloads in the background for next time).
// Only the app's own files, fonts and the Firebase library are handled; Firebase's data traffic passes straight through.
const CACHE = "budget-v1";
const WAIT_MS = 1500;   // GitHub slower than this: open the saved copy now, the new one is used next time
const handled = url => url.origin === location.origin || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" || url.href.startsWith("https://www.gstatic.com/firebasejs/");
const good = res => res.ok || res.type === "opaque";   // cross-site font CSS comes back opaque

const shell = new URL("./", self.registration.scope);
const isCalculation = url => url.pathname === new URL("calculations.js", shell).pathname;

// Keep the matching scripts before saving a new page. An interrupted update
// can then fall back to the previous page with its own script versions.
async function savePage(cache, request, response) {
  const html = await response.clone().text();
  const scripts = [...html.matchAll(/src="((?:config|cloud|calculations)\.js\?v=[^"]+)"/g)];
  await Promise.all(scripts.map(async ([, src]) => {
    const url = new URL(src, shell);
    if (await cache.match(url)) return;
    const script = await fetch(url, { cache: "no-cache" });
    if (!script.ok) throw new Error("Could not cache " + src);
    await cache.put(url, script);
  }));
  await cache.put(request, response);
}

self.addEventListener("install", e => e.waitUntil((async () => {
  const response = await fetch(shell, { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not cache Budget");
  await savePage(await caches.open(CACHE), shell.href, response);
  await self.skipWaiting();
})()));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || !handled(url)) return;
  if (url.origin === location.origin && isCalculation(url)) {
    // Old offline pages must keep loading the calculations they shipped with.
    e.respondWith(caches.match(req).then(res => res || fetch(req, { cache: "no-cache" })));
    return;
  }

  const saved = () => caches.match(req, { ignoreSearch: !url.searchParams.has("v") })
    .then(r => r || (req.mode === "navigate" ? caches.match("./") : undefined));

  // the app's own files skip the 10-minute browser cache and are re-checked every time
  let saving = Promise.resolve();
  const net = fetch(req, url.origin === location.origin ? { cache: "no-cache" } : undefined).then(async res => {
    if (good(res)) {
      const copy = res.clone();
      if (req.mode === "navigate") await savePage(await caches.open(CACHE), req, copy);
      else saving = caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  });
  e.waitUntil(net.then(() => saving).catch(() => {}));   // keep downloading even after the saved copy was shown

  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done) { done = true; clearTimeout(timer); resolve(r); } };
    const savedOr = other => saved().then(s => give(s || other));
    const timer = setTimeout(() => saved().then(s => { if (s) give(s); }), WAIT_MS);   // slow: show the saved copy
    net.then(res => good(res) ? give(res) : savedOr(res),   // error page: saved copy if there is one
             () => savedOr(Response.error()));            // no connection
  }));
});

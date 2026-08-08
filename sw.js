/* ══════════════════════════════════════════════════════════════
   SERVICE WORKER — app-shell caching for reliability on bad networks
   ──────────────────────────────────────────────────────────────
   The problem this solves: on flaky university wifi / weak 4G, the
   app previously had to fully re-fetch every page, script, and font
   from the network on every single visit — and it also depended on
   two separate third-party CDNs. Any single failed request (DNS
   hiccup, timeout, a blocked/throttled CDN domain) could leave the
   page half-loaded or broken, which is exactly what "the link
   doesn't work" looked like.

   Now: every static file (HTML shell, CSS, JS, fonts, logo) is
   cached on first successful visit. After that, opening the app is
   served from cache first — instantly, and it works even with zero
   or terrible connectivity. Only the live Supabase data calls still
   need a real network connection (patients, chat, etc. — that part
   can't be made to work with no connection at all, but the app
   itself booting up no longer depends on the network being good).
   ══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = "riaya-shell-v2";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./admin.html",
  "./duty-doctor-dashboard.html",
  "./head-doctor-dashboard.html",
  "./imaging-dashboard.html",
  "./lab-dashboard.html",
  "./blood-bank-dashboard.html",
  "./assets/design-system.css",
  "./assets/mobile-nav.css",
  "./assets/theme-toggle.js",
  "./assets/idle-logout.js",
  "./assets/logo.png",
  "./assets/vendor/supabase-js.min.js",
  "./assets/vendor/pdf.min.js",
  "./assets/vendor/pdf.worker.min.js",
  "./assets/vendor/tabler-icons/tabler-icons.min.css",
  "./assets/vendor/tabler-icons/fonts/tabler-icons.woff2",
  "./assets/vendor/tabler-icons/fonts/tabler-icons.woff",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll fails entirely if even one file 404s — fetch individually so
      // one missing/renamed asset doesn't stop the whole shell from caching.
      Promise.allSettled(SHELL_FILES.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache/intercept writes

  const url = new URL(req.url);

  // Supabase API/realtime calls: always go to the network — this is live
  // patient data, it must never be served stale from a cache. If the
  // network genuinely isn't there, let it fail normally; the app's own
  // retry logic (where present) handles that, not the service worker.
  if (url.hostname.endsWith(".supabase.co")) return;

  // HTML pages: network-first. The app's own logic changes fairly often —
  // a returning visitor should get today's version whenever they actually
  // have a connection, not whatever got cached on their first-ever visit.
  // Only fall back to the cached copy if the network genuinely fails.
  const isHtmlPage = req.mode === "navigate" || (req.destination === "document") || /\.html$/i.test(url.pathname);
  if (url.origin === self.location.origin && isHtmlPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) caches.open(CACHE_VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else same-origin (fonts, JS libraries, CSS, images — the
  // stuff that rarely changes between deploys): cache-first, so the app
  // opens instantly regardless of connection quality, then top up the
  // cache in the background for next time.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) caches.open(CACHE_VERSION).then((c) => c.put(req, res.clone()));
            return res;
          })
          .catch(() => cached); // offline/flaky network — fall back to cache
        return cached || network;
      })
    );
  }
});

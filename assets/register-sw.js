// Registers the app-shell service worker (see sw.js) so the app keeps
// working on bad wifi / weak cellular after the first successful visit.
// Registration failure (e.g. browser doesn't support service workers) is
// silently ignored — the app still works, it just won't get the offline
// resilience boost.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ══════════════════════════════════════════════════════════════
   IDLE AUTO-LOGOUT
   ──────────────────────────────────────────────────────────────
   Shared/ward devices stay signed in indefinitely otherwise — the
   session lives in that browser's storage until someone explicitly
   hits "Sign out", so the next person to pick up the tablet/phone
   is still logged in as whoever used it last. This watches for
   activity and, after a period of none, warns the doctor with a
   countdown and then signs them out automatically.

   Usage: include this script on any page that already defines a
   global `supabaseClient`, after that client is created:
     <script src="assets/idle-logout.js"></script>
     <script>IdleLogout.init(supabaseClient);</script>
   ══════════════════════════════════════════════════════════════ */
(function () {
  const IDLE_MINUTES = 25;           // no activity for this long...
  const WARNING_SECONDS = 60;        // ...then this long to respond before sign-out
  const IDLE_MS = IDLE_MINUTES * 60 * 1000;

  const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

  let idleTimer = null;
  let countdownTimer = null;
  let countdownRemaining = WARNING_SECONDS;
  let overlayEl = null;
  let client = null;

  function injectStyles() {
    if (document.getElementById("idle-logout-styles")) return;
    const style = document.createElement("style");
    style.id = "idle-logout-styles";
    style.textContent = `
      .idle-logout-backdrop {
        position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center;
        background: rgba(15,32,39,0.55); backdrop-filter: blur(2px); padding: 20px;
      }
      .idle-logout-card {
        width: 100%; max-width: 380px; background: var(--surface, #fff); border-radius: var(--radius-lg, 16px);
        box-shadow: var(--shadow-lg, 0 16px 40px rgba(15,32,39,0.25)); padding: 28px 26px 24px; text-align: center;
        font-family: var(--font, 'Segoe UI', sans-serif); color: var(--ink, #0f2027);
      }
      .idle-logout-icon { font-size: 30px; margin-bottom: 10px; }
      .idle-logout-card h3 { margin: 0 0 8px; font-size: 17px; font-weight: 700; }
      .idle-logout-card p { margin: 0 0 18px; font-size: 13.5px; line-height: 1.55; color: var(--muted-strong, #6b6a63); }
      .idle-logout-count { font-weight: 700; color: var(--red-500, #b5442e); }
      .idle-logout-actions { display: flex; gap: 10px; }
      .idle-logout-actions button {
        flex: 1; padding: 10px 14px; border-radius: var(--radius-md, 10px); font-size: 13.5px; font-weight: 600;
        cursor: pointer; border: 1px solid var(--line, #e2dfd4);
      }
      .idle-logout-stay { background: var(--teal-700, #14746b); border-color: var(--teal-700, #14746b) !important; color: #fff; }
      .idle-logout-stay:hover { background: var(--teal-800, #0e5750); }
      .idle-logout-out { background: transparent; color: var(--ink, #0f2027); }
      .idle-logout-out:hover { background: var(--paper, #f6f4ef); }
    `;
    document.head.appendChild(style);
  }

  function showWarning() {
    if (overlayEl) return;
    injectStyles();
    countdownRemaining = WARNING_SECONDS;

    overlayEl = document.createElement("div");
    overlayEl.className = "idle-logout-backdrop";
    overlayEl.innerHTML = `
      <div class="idle-logout-card">
        <div class="idle-logout-icon">🕐</div>
        <h3>Still there?</h3>
        <p>You've been inactive for a while. For patient data security, you'll be signed out in <span class="idle-logout-count" id="idle-logout-seconds">${countdownRemaining}</span>s.</p>
        <div class="idle-logout-actions">
          <button type="button" class="idle-logout-out" id="idle-logout-signout-now">Sign out now</button>
          <button type="button" class="idle-logout-stay" id="idle-logout-stay">I'm still here</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    document.getElementById("idle-logout-stay").addEventListener("click", dismissWarning);
    document.getElementById("idle-logout-signout-now").addEventListener("click", doSignOut);

    countdownTimer = setInterval(() => {
      countdownRemaining--;
      const secEl = document.getElementById("idle-logout-seconds");
      if (secEl) secEl.textContent = countdownRemaining;
      if (countdownRemaining <= 0) doSignOut();
    }, 1000);
  }

  function dismissWarning() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    resetIdleTimer();
  }

  async function doSignOut() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    try { await client.auth.signOut(); } catch (e) { /* proceed to redirect regardless */ }
    window.location.href = "index.html?signedOut=idle";
  }

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(showWarning, IDLE_MS);
  }

  function onActivity() {
    // While the warning is showing, activity is handled by its own
    // buttons only — moving the mouse shouldn't silently dismiss a
    // security prompt the doctor hasn't actually acknowledged.
    if (overlayEl) return;
    resetIdleTimer();
  }

  const IdleLogout = {
    init(supabaseClientInstance) {
      client = supabaseClientInstance;
      ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));
      resetIdleTimer();
    },
  };

  window.IdleLogout = IdleLogout;
})();

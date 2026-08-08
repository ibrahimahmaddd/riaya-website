// ══════════════════════════════════════════════════════════════
// DARK MODE TOGGLE — shared across every page
// Load this as early as possible in <head> (before any stylesheet)
// so the stored theme is applied before first paint.
// ══════════════════════════════════════════════════════════════
(function () {
  var KEY = "riaya-theme";

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  // Applied immediately on load, before the DOM body exists.
  if (localStorage.getItem(KEY) === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  function updateIcons() {
    document.querySelectorAll(".theme-toggle-btn").forEach(function (btn) {
      btn.innerHTML = isDark() ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
      btn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  function toggleTheme() {
    if (isDark()) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(KEY, "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(KEY, "dark");
    }
    updateIcons();
  }

  // Called once, after the toggle button(s) exist in the DOM.
  window.initThemeToggle = function () {
    updateIcons();
    document.querySelectorAll(".theme-toggle-btn").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
  };
})();

// Shared black/white theme toggle — reused across index.html,
// about-page.html, and index-page/index.html (see theme.css for the
// --bg/--fg variables body.theme-black flips). Persists the choice via
// localStorage so navigating between pages keeps the same theme, since
// these are separate documents rather than a single-page app — each page
// re-reads and re-applies it fresh on load.
(function () {
  const STORAGE_KEY = "czybik-theme";
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const buttons = Array.from(toggle.querySelectorAll(".theme-btn"));

  function apply(theme) {
    document.body.classList.toggle("theme-black", theme === "black");
    buttons.forEach((btn) => {
      btn.classList.toggle("is-inactive", btn.dataset.theme !== theme);
    });
  }

  function readStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeStored(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private mode, etc.) — theme just won't persist across pages.
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      apply(theme);
      writeStored(theme);
    });
  });

  apply(readStored() === "black" ? "black" : "white");
})();

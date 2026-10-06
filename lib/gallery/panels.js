// Info / Index panels (Figma nodes 22:764, 22:372, 22:498), laid over the
// gallery (the homepage's, or a project page's) rather than being pages of
// their own.
//
// Each panel is an independent switch: clicking its button opens or closes
// it. The Info panel takes the top half of the screen and the Index panel
// the bottom half, so either one or both can be showing at once.
//
// While any panel shows, the gallery fades to 4% behind it (see
// body.panels-open in panels.css), scrolling is locked, and the logo is
// hidden. Hovering a project row in the Index brings the gallery's bottom
// row back to full opacity with that project's photos in it, and a click
// opens the project.
//
// projects: the Index's rows, top to bottom, from Sanity ({ title, slug,
// category, client, place, year, photos }, see sanity/fetch.ts).
import { gallery, MOBILE_QUERY } from "./sketch";

export function startPanels(projects) {
  const indexBody = document.getElementById("indexBody");

  const panels = {};
  ["info", "index"].forEach((name) => {
    panels[name] = {
      name,
      el: document.querySelector(`.panel[data-panel="${name}"]`),
      button: document.querySelector(`.panel-toggle[data-panel="${name}"]`),
      open: false,
    };
  });

  function isVisible(panel) {
    return panel.open;
  }

  let wasOpen = false;
  // Where the gallery was scrolled to before the panels opened. The panels
  // park the stack on a three-row frame, and closing them puts it back here.
  let savedScrollY = 0;

  // Safari on a phone scrolls the page behind an open panel anyway,
  // overflow: hidden or not (panels.css), and the gallery then moves about
  // under it. So while a panel is open there, a one-finger drag that isn't
  // scrolling the panel itself is stopped, and the gallery stays still.
  // Listened for only then: a touchmove listener that may stop a drag makes
  // the browser wait on it before every scroll, the gallery's included.
  let pageHeld = false;

  function holdPageStill(event) {
    if (event.touches.length > 1) return; // a pinch zooms, as ever
    const panel = event.target.closest?.(".panel.is-open");
    // The panel scrolls its own content, and overscroll-behavior (panels.css)
    // keeps that from running on into the page at either end.
    if (panel && panel.scrollHeight > panel.clientHeight) return;
    event.preventDefault();
  }

  function render() {
    const anyOpen = Object.values(panels).some(isVisible);

    Object.values(panels).forEach((panel) => {
      const visible = isVisible(panel);
      panel.el.classList.toggle("is-open", visible);
      panel.button.setAttribute("aria-expanded", String(visible));
      panel.button.querySelector(".panel-toggle-sign").textContent = visible ? "-" : "+";
    });

    if (!panels.index.el.classList.contains("is-open")) clearProjectPreview();

    if (anyOpen && !wasOpen) {
      // Only jumps behind a gallery that's already fading out, so the
      // jump itself doesn't show.
      // Never back into the intro (the large logo) on close: opening a
      // panel ends it, see gallery.getIntroEndScrollY.
      savedScrollY = Math.max(window.scrollY, gallery.getIntroEndScrollY());
      window.scrollTo(0, gallery.getThreeRowScrollY());
      gallery.update();
    }

    document.documentElement.classList.toggle("panels-open", anyOpen);
    document.body.classList.toggle("panels-open", anyOpen);

    const holding = anyOpen && MOBILE_QUERY.matches;
    if (holding && !pageHeld) document.addEventListener("touchmove", holdPageStill, { passive: false });
    if (!holding && pageHeld) document.removeEventListener("touchmove", holdPageStill);
    pageHeld = holding;

    if (!anyOpen && wasOpen) {
      window.scrollTo(0, savedScrollY);
      gallery.update();
    }

    wasOpen = anyOpen;
  }

  Object.values(panels).forEach((panel) => {
    panel.button.addEventListener("click", () => {
      panel.open = !panel.open;
      if (panel.open) keepOnlyOnPhone(panel);
      render();
      writeHash();
    });
  });

  document.getElementById("panelBack").addEventListener("click", closeAll);

  // Any click outside the buttons and the Index rows closes both panels. The
  // buttons toggle on their own (above), and the rows are what the Index is
  // for, so clicks there leave it alone.
  document.addEventListener("click", (event) => {
    if (!Object.values(panels).some(isVisible)) return;
    if (event.target.closest(".panel-toggle, .index-body .index-row")) return;
    closeAll();
  });

  function closeAll() {
    Object.values(panels).forEach((panel) => {
      panel.open = false;
    });
    render();
    writeHash();
  }

  // On a phone each panel fills the screen below the buttons, so only one
  // can be open: opening one closes the other (panels.css has the layout).
  function keepOnlyOnPhone(openedPanel) {
    if (!MOBILE_QUERY.matches) return;
    Object.values(panels).forEach((panel) => {
      if (panel !== openedPanel) panel.open = false;
    });
  }

  // Turning a desktop window with both panels open into a phone-sized one:
  // keep the Info, the one at the top.
  MOBILE_QUERY.addEventListener("change", () => {
    if (panels.info.open && panels.index.open) {
      keepOnlyOnPhone(panels.info);
      render();
      writeHash();
    }
  });

  // --- Index rows --------------------------------------------------------
  // Each a link to its project's page, rendered with the page (see
  // components/GalleryPage.tsx).

  let previewProjectIndex = null;

  function showProjectPreview(projectIndex) {
    // On a phone the Index fills the screen, so the bottom row would show
    // under its text; the preview is a hover effect anyway.
    if (MOBILE_QUERY.matches) return;
    if (previewProjectIndex === projectIndex) return;
    previewProjectIndex = projectIndex;
    gallery.previewProject(projects[projectIndex].photos);
  }

  function clearProjectPreview() {
    if (previewProjectIndex === null) return;
    previewProjectIndex = null;
    gallery.clearProjectPreview();
  }

  indexBody.querySelectorAll(".index-row").forEach((row) => {
    const projectIndex = projects.findIndex((project) => project.slug === row.dataset.slug);
    if (projectIndex < 0) return;
    row.addEventListener("pointerenter", () => {
      // The project whose page this is is in the middle already.
      if (row.classList.contains("is-current")) clearProjectPreview();
      else showProjectPreview(projectIndex);
    });
    // On a project page the project comes into the middle straight away
    // (gallery.openProject) and the panels close in front of it; on the
    // homepage the link opens its page. A click for a new tab or window is
    // left to the browser, as on any link.
    row.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!gallery.openProject(projectIndex)) return;
      event.preventDefault();
      closeAll();
    });
  });

  // Leaving the table as a whole, not each row, clears the preview, so
  // moving from one row to the next swaps the photos without a flash of the
  // default ones in between.
  indexBody.addEventListener("pointerleave", clearProjectPreview);

  // --- Deep links: #info, #index, #info+index ----------------------------

  function readHash() {
    const parts = window.location.hash.replace(/^#/, "").toLowerCase().split(/[+,]/);
    Object.values(panels).forEach((panel) => {
      panel.open = parts.includes(panel.name);
    });
    // "#info+index" on a phone: the last one named wins.
    const last = parts.filter((part) => panels[part]).pop();
    if (last) keepOnlyOnPhone(panels[last]);
  }

  function writeHash() {
    const open = Object.values(panels).filter((panel) => panel.open).map((panel) => panel.name);
    const url = window.location.pathname + window.location.search + (open.length ? `#${open.join("+")}` : "");
    window.history.replaceState(null, "", url);
  }

  window.addEventListener("hashchange", () => {
    readHash();
    render();
  });

  readHash();
  // Wait for the first real layout (webfonts, sizes) before parking the
  // stack behind a panel opened from the URL. The page has usually finished
  // loading by the time this runs (it starts once React has), and then
  // there's nothing left to wait for.
  if (Object.values(panels).some(isVisible) && document.readyState !== "complete") {
    window.addEventListener("load", render, { once: true });
  } else {
    render();
  }
}

// Marks the project whose page this is in the Index (.is-current in
// panels.css): as the page opens, and whenever it changes projects (see
// lib/gallery/index.js).
export function markCurrentProject(slug) {
  document.querySelectorAll("#indexBody .index-row").forEach((row) => {
    const current = row.dataset.slug === slug;
    row.classList.toggle("is-current", current);
    if (current) row.setAttribute("aria-current", "page");
    else row.removeAttribute("aria-current");
  });
}

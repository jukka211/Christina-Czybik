// Info / Index panels (Figma nodes 22:764, 22:372, 22:498), laid over the
// homepage gallery rather than being pages of their own.
//
// Each panel is an independent switch: clicking its button opens or closes
// it. The Info panel takes the top half of the screen and the Index panel
// the bottom half, so either one or both can be showing at once.
//
// While any panel shows, the gallery fades to 4% behind it (see
// body.panels-open in panels.css), scrolling is locked, and the logo is
// hidden. Hovering a project row in the Index brings the gallery's bottom
// row back to full opacity with that project's photos in it.
//
// projects: the Index's rows, top to bottom, from Sanity ({ title, category,
// client, place, year, photos }, see sanity/fetch.ts).
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

  let previewRowIndex = null;
  let previewProjectIndex = null;

  function showProjectPreview(projectIndex) {
    // On a phone the Index fills the screen, so the bottom row would show
    // under its text; the preview is a hover effect anyway.
    if (MOBILE_QUERY.matches) return;
    if (previewProjectIndex === projectIndex) return;
    const rowIndex = gallery.getBottomRowIndex();
    if (previewRowIndex !== null && previewRowIndex !== rowIndex) clearProjectPreview();

    previewRowIndex = rowIndex;
    previewProjectIndex = projectIndex;
    gallery.setRowPhotos(rowIndex, projects[projectIndex].photos);
    document.querySelectorAll(".row")[rowIndex].classList.add("is-project-preview");
  }

  function clearProjectPreview() {
    if (previewRowIndex === null) return;
    document.querySelectorAll(".row")[previewRowIndex].classList.remove("is-project-preview");
    gallery.setRowPhotos(previewRowIndex, null);
    previewRowIndex = null;
    previewProjectIndex = null;
  }

  projects.forEach((project, projectIndex) => {
    const row = document.createElement("div");
    row.className = "index-row";
    [
      ["col-project", project.title],
      ["col-category", project.category],
      ["col-client", project.client],
      ["col-place", project.place],
      ["col-year", project.year],
    ].forEach(([className, text]) => {
      const cell = document.createElement("span");
      cell.className = className;
      // Auftraggeber, Ort and Jahr may be left empty in the Studio.
      cell.textContent = text ?? "";
      row.appendChild(cell);
    });
    row.addEventListener("pointerenter", () => showProjectPreview(projectIndex));
    // A click shows the project on the gallery: the panels close first,
    // then it switches to Projekte with this project's row open in the
    // middle.
    row.addEventListener("click", () => {
      closeAll();
      gallery.showProject(projectIndex);
    });
    indexBody.appendChild(row);
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

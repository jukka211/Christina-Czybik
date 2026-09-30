// Opening sequence (Figma 39:2 start, 39:141 middle, 39:282 end): a grid of
// small photos over the full-width, centered logo, before the gallery shows.
//
// 1. The grid (5 x 4 on desktop, 3 x 5 on phones) fills with photos: on
//    desktop only its top and bottom rows, on phones all but the middle
//    one, leaving the middle to the logo.
// 2. Random cells keep switching to photos not shown yet, until each of
//    INTRO_PHOTO_COUNT random photos from the gallery's rows has appeared
//    once.
// 3. The photos then disappear one by one, in random order, leaving the logo.
// 4. The gallery fades in and the logo shrinks into the nav
//    (gallery.playIntro in sketch.js).
//
// Scrolling, a key or a click skips straight to the end. A click also starts
// the logo's shrink, while scrolling or a key leaves the visitor in control.
// The grid asks Sanity's image CDN for tiny copies of the photos (240px on
// the long side, see introUrl below). A cell only switches to a photo that
// has finished loading, so it never shows empty.
import { sanityImageUrl } from "../sanity-image";
import { gallery, INTRO_GRID_WILL_RUN, MOBILE_QUERY } from "./sketch";

export function startIntroGrid() {
  const CYCLE_STEP_MS = 25;
  const SWAPS_PER_STEP = 2;
  const HOLD_MS = 100;
  const VANISH_STEP_MS = 25;
  const AFTER_VANISH_MS = 50;
  // How long the first photos may take to load before the grid shows
  // anyway, so a slow connection doesn't hold the page on a blank screen.
  const FIRST_LOAD_TIMEOUT_MS = 1500;
  // The most the switching may wait for photos still loading, in total,
  // before it moves on to the disappearing with what it has.
  const MAX_WAIT_FOR_PHOTOS_MS = 4000;
  const SKIP_FADE_MS = 300;
  const INTRO_PHOTO_COUNT = 80;

  // Already scrolled (e.g. a reload that restored the scroll position):
  // the opening has nothing to open.
  if (window.scrollY > 0) {
    gallery.releaseImages();
    return;
  }
  // Not on a back / forward return, and not when the page opens straight
  // onto a panel (see INTRO_GRID_WILL_RUN in sketch.js).
  if (!INTRO_GRID_WILL_RUN) {
    gallery.releaseImages();
    return;
  }

  const body = document.body;
  const columns = MOBILE_QUERY.matches ? 3 : 5;
  const rowsCount = MOBILE_QUERY.matches ? 5 : 4;
  // The grid's rows that hold photos. The others keep their place in the
  // layout, empty, so the photo rows sit where they would in a full grid.
  const photoRows = MOBILE_QUERY.matches ? [0, 1, 3, 4] : [0, 3];
  const cellCount = columns * photoRows.length;

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // A random INTRO_PHOTO_COUNT of the rows' photos, each once: a photo
  // picked for two rows is the same Sanity image (the same URL) in both.
  // Capped so the switching lasts as long as it did with the old 80-photo
  // list, however many photos the rows hold. The list holds URLs, which the
  // loading status below is kept by.
  const files = shuffle([...new Set(gallery.getPhotos().map((photo) => photo.url))])
    .slice(0, INTRO_PHOTO_COUNT);

  // About 6KB each: 240px on the long side, quality 60.
  function introUrl(url) {
    return sanityImageUrl(url, { w: 240, h: 240, fit: "max", q: 60 });
  }

  // "ready" once downloaded, "failed" if it couldn't be. The first cells'
  // photos are fetched first; the rest start once those are in, so they
  // don't compete with the photos the visitor sees first.
  const status = new Map();
  function preload(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        status.set(url, "ready");
        resolve();
      };
      img.onerror = () => {
        status.set(url, "failed");
        resolve();
      };
      img.src = introUrl(url);
    });
  }

  const firstLoad = Promise.all(files.slice(0, cellCount).map(preload));
  firstLoad.then(() => files.slice(cellCount).forEach(preload));

  function showFile(img, url) {
    if (status.get(url) === "failed") return;
    img.src = introUrl(url);
  }

  const grid = document.createElement("div");
  grid.className = "intro-grid";
  grid.style.setProperty("--intro-cols", columns);
  grid.style.setProperty("--intro-rows", rowsCount);
  grid.setAttribute("aria-hidden", "true");

  const cells = [];
  for (let i = 0; i < cellCount; i += 1) {
    const cell = document.createElement("div");
    cell.className = "intro-grid-cell";
    cell.style.gridRow = String(photoRows[Math.floor(i / columns)] + 1);
    const img = document.createElement("img");
    img.alt = "";
    // Invisible until its first photo has arrived (intro.css), so a slow
    // connection shows an emptier grid rather than broken boxes.
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    cell.appendChild(img);
    grid.appendChild(cell);
    cells.push({ cell, img });
  }

  body.classList.add("is-intro-grid");
  body.appendChild(grid);

  let finished = false;
  const timers = [];
  const later = (fn, ms) => timers.push(window.setTimeout(fn, ms));

  function finish(playLogo) {
    if (finished) return;
    finished = true;
    timers.forEach((id) => window.clearTimeout(id));
    window.clearInterval(cycleIntervalId);
    removeSkipListeners();

    grid.classList.add("is-done");
    body.classList.remove("is-intro-grid");
    // The gallery's own photos can download now (see sketch.js).
    gallery.releaseImages();
    window.setTimeout(() => grid.remove(), SKIP_FADE_MS + 100);
    if (playLogo) gallery.playIntro();
  }

  // --- 1. Fill ---------------------------------------------------------
  const firstFiles = files.slice(0, cellCount);
  cells.forEach(({ img }, i) => {
    if (firstFiles[i]) showFile(img, firstFiles[i]);
  });

  let cycleIntervalId = null;
  let nextFileIndex = cellCount;

  Promise.race([
    firstLoad,
    new Promise((resolve) => window.setTimeout(resolve, FIRST_LOAD_TIMEOUT_MS)),
  ]).then(() => {
    if (finished) return;
    grid.classList.add("is-visible");
    cycleIntervalId = window.setInterval(cycle, CYCLE_STEP_MS);
  });

  // --- 2. Switch until every photo has been shown ------------------------
  // Picks from the cells that weren't switched in the previous step, so the
  // changes keep moving around the grid instead of flickering in one place.
  let lastSwitched = new Set();
  let waitedMs = 0;
  function cycle() {
    // Photos that couldn't load are skipped rather than shown empty.
    while (nextFileIndex < files.length && status.get(files[nextFileIndex]) === "failed") {
      nextFileIndex += 1;
    }
    // The next photo is still downloading: wait for it, up to a limit.
    if (nextFileIndex < files.length && status.get(files[nextFileIndex]) !== "ready") {
      waitedMs += CYCLE_STEP_MS;
      if (waitedMs < MAX_WAIT_FOR_PHOTOS_MS) return;
      nextFileIndex = files.length;
    }
    if (nextFileIndex >= files.length) {
      window.clearInterval(cycleIntervalId);
      later(vanish, HOLD_MS);
      return;
    }
    const candidates = shuffle(cells.map((_, i) => i).filter((i) => !lastSwitched.has(i)));
    const switched = new Set();
    for (
      let k = 0;
      k < SWAPS_PER_STEP && nextFileIndex < files.length && status.get(files[nextFileIndex]) === "ready";
      k += 1
    ) {
      const i = candidates[k];
      showFile(cells[i].img, files[nextFileIndex]);
      nextFileIndex += 1;
      switched.add(i);
    }
    lastSwitched = switched;
  }

  // --- 3. Disappear in random order ------------------------------------
  function vanish() {
    shuffle(cells).forEach(({ cell }, order) => {
      later(() => cell.classList.add("is-gone"), order * VANISH_STEP_MS);
    });
    later(() => finish(true), cells.length * VANISH_STEP_MS + AFTER_VANISH_MS);
  }

  // --- Skipping ----------------------------------------------------------
  const skipQuietly = () => finish(false);
  const skipAndPlay = () => finish(true);
  // Any scroll away from the top, whether the visitor's or the browser
  // restoring an earlier position after load.
  const onScroll = () => {
    if (window.scrollY > 0) skipQuietly();
  };

  function removeSkipListeners() {
    ["wheel", "touchmove", "keydown"].forEach((type) => window.removeEventListener(type, skipQuietly));
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("click", skipAndPlay);
  }

  ["wheel", "touchmove", "keydown"].forEach((type) => {
    window.addEventListener(type, skipQuietly, { passive: true });
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("click", skipAndPlay);
}

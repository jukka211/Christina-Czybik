// Vertical: one row expands to MAX_VH, the rest collapse to MIN_VH, and the
// expanded row moves down the column as the page scrolls (a "distance from
// activePosition" stack, same shape as the card-stack algorithm in
// HomePageClient.tsx — mod/wrapped distance, cumulative-offset stacking —
// just applied to whole rows instead of individual cards).
//
// Horizontal (outside fullscreen): within a row, images are pulled
// dynamically from IMAGE_FILES as needed (not a fixed 5) — only images
// within VISIBLE_RANGE of activeIndex are actually mounted, the centered
// one is large and every other visible one is a fixed small size, and
// they're spread edge to edge across the row via space-between. Navigation
// is click-only (left/right half of the row steps activeIndex) and instant
// — no animation.
//
// Fullscreen: clicking a narrow band centered on the row opens it — not
// the horizontal in-row stack blown up, but a vertical column
// (.row-column in style.css/sketch.js) that reuses the *outer* page's own
// row-stacking algorithm (getActivePosition/getCenters/getOffsets) one
// level down: the row's own image pool takes the place of the 5 rows, one
// image centered and full-size (MAX_VH) at a time, its neighbors shrunk to
// MIN_VH above and below, continuously interpolating as you scroll — same
// math, same MAX_VH/MIN_VH/PAUSE_WEIGHT/RAMP_WEIGHT constants, just
// applied to individual images instead of whole rows. Driven by wheel
// deltaY accumulated locally (not window scroll, which stays parked on the
// outer page while fullscreen covers it) through that same pause-then-ramp
// shape, tiled indefinitely instead of bounded to ROW_COUNT-1 steps. Any
// click closes fullscreen instead of stepping. The open/close jump itself
// is the only animated moment anywhere in this file — see
// fullscreen-transition in style.css.

const IMAGE_FILES = [
  "2023-08-31_CZY_Features009.JPG",
  "20230329_CZY_Bundestag002 1.jpg",
  "20230329_CZY_Bundestag013.JPG",
  "20230329_CZY_Bundestag038.JPG",
  "20230501_CZY_Bundestag010 1.jpg",
  "20230608_CZY_PV_Anlagen028.JPG",
  "20230613_CZY_Steinmeier_Ortszeit006.JPG",
  "20230613_CZY_Steinmeier_Ortszeit057 1.jpg",
  "20230613_CZY_Steinmeier_Ortszeit060 1.jpg",
  "20231208_CZY_SPD_Bundesparteitag065.JPG",
  "20231209_CZY_SPD_Bundesparteitag046.JPG",
  "20231209_CZY_SPD_Bundesparteitag076.JPG",
  "20240313_CZY_Bundestag008.JPG",
  "20240313_CZY_Bundestag017.JPG",
  "20240318_bundesfoto_BMWK_BM_Habeck_HH_226.JPG",
  "20240318_bundesfoto_BMWK_BM_Habeck_HH_244.JPG",
  "20240420_CZY_Steinmeier_Munster010.JPG",
  "20240422_bundesfoto_CC_BMWK_HannoverMesse018.JPG",
  "20240709_bundesfoto_BK_Sommerreise_CC_111.JPG",
  "20240709_bundesfoto_BK_Sommerreise_CC_177.JPG",
  "20240816_bundesfoto_CC_Porträts002_Highres.JPG",
  "20240816_bundesfoto_CC_Porträts062_Highres.JPG",
  "20240819_bundesfoto_CC_Sicherheitstour_BMI168.JPG",
  "20240917_bundesfoto_CC_BMWK_StartupSummit049.JPEG",
  "20241003_bundesfoto_CC_BK_TdDE_008.JPG",
  "20241003_bundesfoto_CC_BK_TdDE_020.JPG",
  "20241016_CZY_OrtszeitNordhorn_094.JPG",
  "20241030_CZYBIK_BMI_Polen094.JPG",
  "20241111_bundesfoto_BK_PANDA195.JPG",
  "20241202_CZY_BMI_Griechenland088.JPG",
  "20250214_Czybik_LandesvertretungNRW_Bundesrat_086.JPG",
  "20250218_bundesfoto_CC_BMI_Staatstrauerakt_007.JPG",
  "20250218_bundesfoto_CC_BMI_Staatstrauerakt_026.JPG",
  "20250321_Czybik_NRW_Bundesrat_146.JPG",
  "20250401_bundesfoto_CC_BMWK_Hannovermesse_065.JPG",
  "20250409_bundesfoto_CC_BMI_Lübeck_035.JPG",
  "20250411_Czybik_BundesratNRW_026.JPG",
  "20250411_Czybik_BundesratNRW_083.JPG",
  "20250513_Czybik_Steinmeier_Israelreise053.JPG",
  "20250513_Czybik_Steinmeier_Israelreise079.JPG",
  "20250514_Czybik_Steinmeier_Israelreise152.JPG",
  "20250514_Czybik_Steinmeier_Israelreise175.JPG",
  "20250514_Czybik_Steinmeier_Israelreise191.JPG",
  "20250514_Czybik_Steinmeier_Israelreise227 1.jpg",
  "20251118_bundesfoto_BMDS_490.JPG",
  "20251218_CZYBIK_Weihnachtssingen_026.JPG",
  "20260120_CZY_GTAI_Netzwerktreffen_030.JPG",
  "20260215_CZY_NRW_Berlinale_030.JPG",
  "20260324_Czybik_DBT_Ausstellungseroeffnung_033.JPG",
  "20260611_CZY_Peacekeeping_001.JPG",
  "20260616_CC_BKM_Gedaechtniskirche_057.JPG",
  "20260713_CS_CC_BMFTR_DLR_112.JPG",
  "20260713_CS_CC_BMFTR_DLR_128.JPG",
  "20260714_CS_CC_BMFTR_DLR_212.JPG",
  "20260714_CS_CC_BMFTR_DLR_330.JPG",
  "20260714_CS_CC_BMFTR_DLR_351.JPG",
  "220517_bundesfoto_CZY_HabeckThueringen252.JPG",
  "220517_bundesfoto_CZY_HabeckThueringen_vorab358.JPG",
  "220616_CZY_bundesfoto_BMWK_Bremen031.JPG",
  "220927_BUNDESFOTO_CC_BMWK_MESSE_Highres052.JPG",
  "221017_CC_bundesfoto_BMWK_Prag106.JPG",
  "221021_CC_bundesfoto_BMWK_Aurubis023.JPG",
  "221217_bundesfoto_CC_BMWK_Wilhelmshaven088.JPG",
  "230222_CC_bundesfoto_BMWK_Lausitztag276.JPG",
  "230323_bundesfoto_CC_BMWK_Offshore011.JPG",
  "230726_bundesfoto_ThyssenKrupp_BMWK_CC042.JPG",
  "230831_bundesfoto_CZY_Pressereise_Highres061.JPG",
  "231031_bundesfoto_CC_BMWK_Industriekonferenz025.JPG",
  "231211_bundesfoto_BMWK_CC_Saarland095.JPG",
  "240306_bundesfoto_CC_BK_Weltfrauentag064.JPG",
  "Czybik_20210911_BerlinFeatures004 1.jpg",
  "Czybik_20210911_BerlinFeatures015 1.jpg",
  "Czybik_ADC_ScholzFriends001 1.jpg",
  "Czybik_ADC_ScholzFriends018 1.jpg",
  "Screenshot 2026-07-20 at 14.49.59 2.jpg",
];

const ROW_COUNT = 5;
const MAX_VH = 75;
const MIN_VH = 6;
const ROW_GAP_REM = 4;
// Fixed px gap between a row-title's own bottom edge and its row's top edge
// (see updateRowTitles) — separate from the general inter-row gap above,
// which spaces whole rows from each other regardless of titles.
const ROW_TITLE_GAP_PX = 8;
// A representative landscape aspect ratio (width/height), same convention
// used elsewhere in this project.
const IMG_ASPECT_RATIO = 900 / 588;
const IMG_MAX_WIDTH_VH = MAX_VH * IMG_ASPECT_RATIO;
const IMG_MIN_WIDTH_VH = MIN_VH * IMG_ASPECT_RATIO;

// How many images on each side of the centered one are mounted — 2 gives 5
// total visible per row (2 small + large + 2 small); the rest of
// IMAGE_FILES stays unloaded until scrolled into range.
const VISIBLE_RANGE = 2;
// A stride between rows' starting file offsets so neighboring rows don't
// show the same images at the same position.
const ROW_FILE_OFFSET_STRIDE = 11;
// Width of the "open fullscreen" click zone, centered on the row — outside
// it, clicking left/right of that center band steps focus instead.
const FULLSCREEN_CLICK_ZONE_VW = 10;
// Matches the transition duration on .row.fullscreen-transition in
// style.css — how long the class stays on the rows after toggling
// fullscreen, giving that one change (and only that change) room to
// animate before reverting to instant for regular navigation.
const FULLSCREEN_TRANSITION_MS = 400;

// How the raw linear scroll progress maps to activePosition: PAUSE_WEIGHT is
// how much scroll distance is spent holding a row at full size, RAMP_WEIGHT
// is how much is spent transitioning to the next row. Equal weight per unit,
// so e.g. PAUSE_WEIGHT = RAMP_WEIGHT means "pause as long as the transition".
const PAUSE_WEIGHT = 0.3;
const RAMP_WEIGHT = 0.5;
// The intro is one extra ramp segment prepended to the timeline, from a
// virtual activePosition of -1 (page freshly opened: logo blown up to the
// full viewport width, row 0 fully collapsed and parked at the bottom of
// the screen, every other row below the fold) to 0 (row 0 fully active —
// the state the page used to open in). Weighted like a slightly longer
// RAMP_WEIGHT since it carries more visual change than a row handover does.
// .stack-wrapper's height in style.css was grown by this segment's share of
// the timeline so the existing rows' scroll pacing is unchanged.
const INTRO_WEIGHT = 0.6;
// Gap between the collapsed row's bottom edge and the bottom of the
// viewport at the very start of the intro; INTRO_ROW_SHIFT_VH turns that
// into how far the whole row stack is pushed down from its normal
// viewport-centered position there (its center, not its edge, is what
// getOffsets works in).
const INTRO_ROW_BOTTOM_VH = 2;
const INTRO_ROW_SHIFT_VH = 50 - INTRO_ROW_BOTTOM_VH - MIN_VH / 2;
// Where in the intro the row titles start fading in. The nav itself is at
// rest and fully visible from the opening frame — only the per-row category
// labels hold back, since at the start there's just the one collapsed row
// and its label would sit alone at the bottom of an otherwise empty screen.
const INTRO_TITLE_FADE_START = 0.55;

// One full pause-then-ramp cycle, i.e. the scroll "distance" (in the same
// weight units as PAUSE_WEIGHT/RAMP_WEIGHT) it takes the fullscreen column
// to move from one image fully centered to the next — see
// scrollUnitsToPosition, which tiles this indefinitely instead of bounding
// it to ROW_COUNT-1 steps the way getActivePosition does for the outer page.
const COLUMN_STEP_WEIGHT = PAUSE_WEIGHT + RAMP_WEIGHT;
// How many pixels of accumulated wheel deltaY equal one COLUMN_STEP_WEIGHT
// — i.e. how far you have to scroll the fullscreen column to fully move on
// to the next image. Tunable purely by feel.
const FULLSCREEN_COLUMN_PX_PER_STEP = 700;

const stackWrapper = document.getElementById("stackWrapper");
const stickyViewport = document.getElementById("stickyViewport");
const topNav = document.getElementById("topNav");
const navCenter = topNav.querySelector(".nav-center");
const navLogo = document.getElementById("navLogo");
const bottomFooter = document.getElementById("bottomFooter");
const fullscreenTitle = document.getElementById("fullscreenTitle");
const fullscreenTitleType = document.getElementById("fullscreenTitleType");
const fullscreenTitleCat = document.getElementById("fullscreenTitleCat");
const fullscreenTitleCount = document.getElementById("fullscreenTitleCount");
// Which row (if any) is currently shown in fullscreen — set by clicking a
// row's active image, cleared by clicking it again.
let fullscreenRowIndex = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mod(value, total) {
  return ((value % total) + total) % total;
}

// Each row treats IMAGE_FILES as an infinite, wrapping strip — poolIndex is
// a plain unbounded integer (it just keeps counting up/down as you click
// further in either direction) and only the filename lookup wraps, via mod.
// rowIndex offsets where each row starts in that strip, purely for variety.
function getRowFileName(rowIndex, poolIndex) {
  return IMAGE_FILES[mod(poolIndex + rowIndex * ROW_FILE_OFFSET_STRIDE, IMAGE_FILES.length)];
}

// The two-tier size (at full row size — see getImageSize for the blend with
// the row's own collapsed/active state) for an image `distance` steps from
// the centered one: the centered image is large, everything else visible
// (up to VISIBLE_RANGE either side) is IMG_MIN_WIDTH_VH/MIN_VH — the same
// "small" size a fully collapsed row's images already use, so the small
// images look consistent whether they're next to a large one in the active
// row or uniformly small in a collapsed one. Not used at all in fullscreen
// mode — see applyLayout, which sizes every image uniformly there instead.
function getStackSize(distance) {
  if (distance === 0) return { width: IMG_MAX_WIDTH_VH, height: MAX_VH };
  return { width: IMG_MIN_WIDTH_VH, height: MIN_VH };
}

// Blends the stack tier size toward the row's own collapsed size by
// rowDistance (0 = row fully active, 1 = fully collapsed) — the large tier
// shrinks toward MIN_VH as the row collapses; the small tier is already
// MIN_VH, so this is a no-op for it.
function getImageSize(distance, rowDistance) {
  const stack = getStackSize(distance);
  return {
    width: lerp(stack.width, IMG_MIN_WIDTH_VH, rowDistance),
    height: lerp(stack.height, MIN_VH, rowDistance),
  };
}

// Drives one row's whole horizontal system off a single index — activeIndex
// — instead of measured geometry, so there's no feedback loop (measuring
// position to decide size, when position is itself a result of every
// image's size, never settles and thrashes layout every frame). No
// animation here — activeIndex jumps immediately on click and the row
// re-renders in the same tick, so switching is an instant snap, not a
// transition.
function setUpRow(row, rowIndex) {
  let activeIndex = 0;
  let rowDistance = 1;
  let isFullscreen = false;
  const mounted = new Map(); // poolIndex -> img element

  function applyLayout() {
    const coreMin = activeIndex - VISIBLE_RANGE;
    const coreMax = activeIndex + VISIBLE_RANGE;

    mounted.forEach((img, poolIndex) => {
      if (poolIndex >= coreMin && poolIndex <= coreMax) return;
      img.remove();
      mounted.delete(poolIndex);
    });

    for (let i = coreMin; i <= coreMax; i += 1) {
      if (mounted.has(i)) continue;
      const img = document.createElement("img");
      img.src = `images/${encodeURIComponent(getRowFileName(rowIndex, i))}`;
      img.alt = "";
      img.loading = "lazy";
      row.appendChild(img);
      mounted.set(i, img);
    }

    // Sizes are set in vh, but spreading images across the row's actual
    // width needs both in the same unit — convert to real px using the
    // current vh->px rate (row.clientWidth is a single cheap read; it's the
    // row's own box, set from outside by the vertical stack, so reading it
    // doesn't depend on anything this function itself writes).
    const vhToPx = window.innerHeight / 100;
    const rowWidthPx = row.clientWidth;

    const sizes = new Map();
    mounted.forEach((img, poolIndex) => {
      const size = getImageSize(poolIndex - activeIndex, rowDistance);
      sizes.set(poolIndex, size);
      img.style.width = `${size.width}vh`;
      img.style.height = `${size.height}vh`;
    });

    // True space-between: the leftover width (row width minus every
    // mounted image's own width — always exactly the 5 within
    // VISIBLE_RANGE, since activeIndex is a plain integer) is divided
    // evenly into the 4 gaps between them, so they spread across the row's
    // full width instead of clustering with a small fixed gap — same idea
    // as getCenters() in HomePageClient.tsx, just with a space-between gap
    // instead of a flat one, and in px instead of vh/vw.
    const orderedIndices = Array.from(mounted.keys()).sort((a, b) => a - b);
    const totalWidthPx = orderedIndices.reduce((sum, i) => sum + sizes.get(i).width * vhToPx, 0);
    const gapPx = Math.max(0, (rowWidthPx - totalWidthPx) / Math.max(orderedIndices.length - 1, 1));

    const centers = new Map();
    let cursor = 0;
    orderedIndices.forEach((poolIndex) => {
      const widthPx = sizes.get(poolIndex).width * vhToPx;
      centers.set(poolIndex, cursor + widthPx / 2);
      cursor += widthPx + gapPx;
    });

    const focusCenter = centers.get(activeIndex) ?? 0;

    mounted.forEach((img, poolIndex) => {
      const offset = centers.get(poolIndex) - focusCenter;
      img.style.transform = `translate(calc(-50% + ${offset}px), -50%)`;
    });
  }

  // "center" = the narrow FULLSCREEN_CLICK_ZONE_VW band that opens
  // fullscreen; otherwise "left"/"right" by which half of the row the
  // pointer is on. Shared between the click handler and the cursor
  // hover-feedback below, so they always agree on where the zones are.
  function getZone(event) {
    const rect = row.getBoundingClientRect();
    const rowCenterX = rect.left + rect.width / 2;
    const fullscreenZoneHalfWidthPx = (FULLSCREEN_CLICK_ZONE_VW / 100) * window.innerWidth / 2;

    if (Math.abs(event.clientX - rowCenterX) <= fullscreenZoneHalfWidthPx) return "center";
    return event.clientX - rect.left < rect.width / 2 ? "left" : "right";
  }

  // Outside fullscreen: clicking the center zone opens it; clicking
  // left/right of it steps focus that direction instead. Inside
  // fullscreen: navigation is by mouse wheel (below), not click, so any
  // click just closes it.
  row.addEventListener("click", (event) => {
    if (isFullscreen) {
      setFullscreenRow(rowIndex);
      return;
    }

    const zone = getZone(event);
    if (zone === "center") {
      setFullscreenRow(rowIndex);
      return;
    }

    activeIndex += zone === "left" ? -1 : 1;
    applyLayout();
  });

  // Cursor hints at what a click there will do: directional arrows over the
  // left/right (step) zones, zoom-in over the center (open fullscreen)
  // zone, zoom-out anywhere once already fullscreen (since any click there
  // closes it).
  row.addEventListener("mousemove", (event) => {
    if (isFullscreen) {
      row.style.cursor = "zoom-out";
      return;
    }

    const zone = getZone(event);
    row.style.cursor = zone === "center" ? "zoom-in" : zone === "left" ? "w-resize" : "e-resize";
  });

  // Fullscreen's own layout: a vertical column that reuses the outer
  // page's row-stacking math (getActivePosition/getCenters/getOffsets),
  // just one level down — the row's own image pool stands in for the 5
  // rows, and columnScrollUnits (driven by wheel deltaY, not window
  // scroll) stands in for the outer page's scroll progress. Windowed
  // mount/unmount (same idea as applyLayout's `mounted` above) since
  // IMAGE_FILES is far bigger than what's ever near the centered image at
  // once. Hidden by default (style.css) and shown only via
  // .row.is-fullscreen, toggled in update().
  const column = document.createElement("div");
  column.className = "row-column";
  row.appendChild(column);

  const columnMounted = new Map(); // poolIndex -> img element
  let columnScrollUnits = 0; // arbitrary units; see scrollUnitsToPosition

  // Tiles the outer page's pause-then-ramp shape (see getActivePosition)
  // indefinitely instead of bounding it to ROW_COUNT-1 steps: every
  // COLUMN_STEP_WEIGHT of units holds flat on one index for PAUSE_WEIGHT,
  // then ramps linearly to the next index over RAMP_WEIGHT. Works for
  // negative units the same way (Math.floor rounds toward -Infinity), so
  // scrolling back up past the first image is just as well-defined as
  // scrolling forward past the last one — same "infinite wrapping strip"
  // treatment IMAGE_FILES already gets elsewhere via mod().
  function scrollUnitsToPosition(units) {
    const index = Math.floor(units / COLUMN_STEP_WEIGHT);
    const local = units - index * COLUMN_STEP_WEIGHT;
    if (local <= PAUSE_WEIGHT) return index;
    return lerp(index, index + 1, clamp((local - PAUSE_WEIGHT) / RAMP_WEIGHT, 0, 1));
  }

  // Per-frame render for the column: mount/unmount the window of images
  // around the current (possibly fractional) position, then size and
  // stack them exactly like the outer page stacks rows — distance-from-
  // position drives a continuous MAX_VH/MIN_VH lerp per image, and the
  // cumulative-offset centers (same shape as getCenters/getOffsets) pin
  // the interpolated floor/ceil focus point to the row's own center.
  function applyColumnLayout() {
    const columnPosition = scrollUnitsToPosition(columnScrollUnits);
    const floorIndex = Math.floor(columnPosition);
    const ceilIndex = Math.ceil(columnPosition);
    const coreMin = floorIndex - VISIBLE_RANGE;
    const coreMax = ceilIndex + VISIBLE_RANGE;

    columnMounted.forEach((img, poolIndex) => {
      if (poolIndex >= coreMin && poolIndex <= coreMax) return;
      img.remove();
      columnMounted.delete(poolIndex);
    });

    for (let i = coreMin; i <= coreMax; i += 1) {
      if (columnMounted.has(i)) continue;
      const img = document.createElement("img");
      img.src = `images/${encodeURIComponent(getRowFileName(rowIndex, i))}`;
      img.alt = "";
      img.loading = "lazy";
      column.appendChild(img);
      columnMounted.set(i, img);
    }

    const gapVh = getRowGapVh();
    const orderedIndices = Array.from(columnMounted.keys()).sort((a, b) => a - b);

    const sizes = new Map();
    const centers = new Map();
    let cursor = 0;
    orderedIndices.forEach((poolIndex) => {
      const distance = clamp(Math.abs(poolIndex - columnPosition), 0, 1);
      const size = { width: lerp(IMG_MAX_WIDTH_VH, IMG_MIN_WIDTH_VH, distance), height: lerp(MAX_VH, MIN_VH, distance) };
      sizes.set(poolIndex, size);
      centers.set(poolIndex, cursor + size.height / 2);
      cursor += size.height + gapVh;
    });

    const floorCenter = centers.get(floorIndex) ?? 0;
    const ceilCenter = centers.get(ceilIndex) ?? floorCenter;
    const focusCenter = lerp(floorCenter, ceilCenter, columnPosition - floorIndex);

    columnMounted.forEach((img, poolIndex) => {
      const size = sizes.get(poolIndex);
      img.style.width = `${size.width}vh`;
      img.style.height = `${size.height}vh`;
      const offset = centers.get(poolIndex) - focusCenter;
      img.style.transform = `translate(-50%, calc(-50% + ${offset}vh))`;
    });
  }

  // A plain mouse wheel only produces vertical delta, which is exactly
  // what should drive the column — captured here (not left to native
  // scroll, since the column has no scroll container of its own) and
  // translated into columnScrollUnits. No isFullscreen guard needed: the
  // column is display: none (and so un-hit-testable) except while it
  // actually is fullscreen.
  column.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      columnScrollUnits += (event.deltaY / FULLSCREEN_COLUMN_PX_PER_STEP) * COLUMN_STEP_WEIGHT;
      applyColumnLayout();
    },
    { passive: false },
  );

  // Aligns columnScrollUnits so scrollUnitsToPosition resolves to exactly
  // activeIndex (the pause phase's flat start, local = 0) — called
  // synchronously right after the fullscreen-opening update() (see
  // setFullscreenRow) so the column opens already centered on the same
  // image that was active in the stack, rather than wherever it was left
  // scrolled to last time.
  function centerColumnOnActiveImage() {
    columnScrollUnits = activeIndex * COLUMN_STEP_WEIGHT;
    applyColumnLayout();
  }

  return {
    centerColumnOnActiveImage,
    setRowDistance(distance, fullscreen) {
      rowDistance = distance;
      isFullscreen = fullscreen;
      // Fully collapsed — reset focus so the row starts fresh, centered on
      // its first image, the next time it grows.
      if (distance >= 1) activeIndex = 0;
      // The stack (large/small positioning) is hidden and inert while
      // fullscreen — nothing about it changes during that time (rowDistance
      // is pinned to 0 and activeIndex is frozen), so there's no need to
      // keep recomputing it every render; it picks back up exactly where it
      // left off once fullscreen closes.
      if (!fullscreen) applyLayout();
    },
  };
}

// Placeholder title-row content — category name + "current/total" counter,
// styled per the Figma title-row spec but not wired to anything real yet:
// text only, no live activeIndex tracking, no per-category image counts.
// Only "Politik" and "Veranstaltung" are real category names from the
// design; the rest are left as "—" until the real categories are known.
const ROW_TITLES = [
  { type: "Kat.", category: "Politik", count: "01/75" },
  { type: "Kat.", category: "Veranstaltung", count: "01/75" },
  { type: "Kat.", category: "Social Media", count: "01/75" },
  { type: "Kat.", category: "Porträt", count: "01/75" },
  { type: "Kat.", category: "Reportage", count: "01/75" },
];

const rows = [];
const rowTitles = [];
const rowControllers = [];

for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
  const row = document.createElement("div");
  row.className = "row";

  // A sibling of .row, not a child — sitting inside .row would mean living
  // inside its overflow: hidden clip, pinned to its top edge and so
  // overlaying the image content underneath. As its own element it's free
  // to sit in the gap above the row instead (see updateRowTitles).
  //
  // Two layouts, per Figma nodes 17:121 (large) and 17:124 (small) — full
  // width in both cases (see .row-title in style.css), three separate
  // spans (type/category/count) spread with space-between while the row is
  // the large/active one, category alone centered (type and count both
  // hidden) once it's collapsed past the halfway point. updateRowTitles
  // toggles which one applies every scroll frame.
  const rowTitle = document.createElement("div");
  rowTitle.className = "row-title";
  rowTitle.innerHTML = `<span class="row-title-type">${ROW_TITLES[rowIndex].type}:</span><span class="row-title-cat">${ROW_TITLES[rowIndex].category}</span><span class="row-title-count">${ROW_TITLES[rowIndex].count}</span>`;
  stickyViewport.appendChild(rowTitle);
  rowTitles.push(rowTitle);

  rowControllers.push(setUpRow(row, rowIndex));
  stickyViewport.appendChild(row);
  rows.push(row);
}

// Builds an alternating [intro ramp -1->0, pause at 0, ramp 0->1, pause at
// 1, ...] timeline and walks a linear 0..1 scroll progress through it, so
// scrolling holds each row at full size for a stretch before continuing to
// the next.
//
// The leading intro segment means activePosition starts at -1 rather than 0
// — "one step before row 0 is active", which every downstream consumer
// already handles without a special case: getDistances clamps |0 - (-1)| to
// a distance of 1, so row 0 is collapsed to MIN_VH exactly like any other
// inactive row, and getOffsets clamps its floor/ceil lookups into range, so
// the stack stays centered on row 0 (update() then pushes it down to the
// bottom of the screen by INTRO_ROW_SHIFT_VH). Scrolling out of the intro is
// therefore the same continuous "row grows as it becomes active" motion that
// every later row transition already is.
function getActivePosition(rawProgress) {
  const segments = [{ weight: INTRO_WEIGHT, from: -1, to: 0 }];
  for (let i = 0; i < ROW_COUNT; i += 1) {
    segments.push({ weight: PAUSE_WEIGHT, from: i, to: i });
    if (i < ROW_COUNT - 1) {
      segments.push({ weight: RAMP_WEIGHT, from: i, to: i + 1 });
    }
  }

  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let remaining = clamp(rawProgress, 0, 1) * totalWeight;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (remaining <= segment.weight || i === segments.length - 1) {
      const t = segment.weight > 0 ? clamp(remaining / segment.weight, 0, 1) : 1;
      return lerp(segment.from, segment.to, t);
    }
    remaining -= segment.weight;
  }

  return ROW_COUNT - 1;
}

function getDistances(activePosition) {
  return rows.map((_, index) => clamp(Math.abs(index - activePosition), 0, 1));
}

function getHeights(distances) {
  return distances.map((distance) => lerp(MAX_VH, MIN_VH, distance));
}

// 1rem converted to vh, so the gap stays exactly 1rem regardless of viewport
// height even though the stacking math works in vh throughout.
function getRowGapVh() {
  const rootFontSizePx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const gapPx = ROW_GAP_REM * rootFontSizePx;
  return (gapPx / window.innerHeight) * 100;
}

// Stacks rows with a fixed gap between them, each one's center at the
// cumulative sum of the heights (and gaps) above it.
function getCenters(heights, gapVh) {
  const centers = new Array(heights.length);
  let cursor = 0;

  for (let i = 0; i < heights.length; i += 1) {
    centers[i] = cursor + heights[i] / 2;
    cursor += heights[i] + gapVh;
  }

  return centers;
}

// Pins the viewport center to a point that itself glides continuously between
// the two rows straddling activePosition — no discrete "active row" switch,
// so there's no jump when activePosition crosses a row boundary.
function getOffsets(heights, activePosition, gapVh) {
  const centers = getCenters(heights, gapVh);
  const floorIndex = clamp(Math.floor(activePosition), 0, heights.length - 1);
  const ceilIndex = clamp(Math.ceil(activePosition), 0, heights.length - 1);
  const frac = activePosition - Math.floor(activePosition);
  const focusCenter = lerp(centers[floorIndex], centers[ceilIndex], frac);

  return centers.map((center) => center - focusCenter);
}

// The logo's geometry in its normal, untransformed resting state — where
// its left edge sits and how wide it actually draws. Both are read once per
// layout change rather than per frame, since updateIntroLogo needs the
// *untransformed* box and reading it while its own transform is applied
// would feed its previous output back into its next input.
//
// contentWidth deliberately subtracts .nav-logo's padding-right: the SVG
// element is 35vw wide but 9vw of that is empty padding, and it's the drawn
// 26vw that has to reach the far edge of the screen at full scale, not the
// padded box.
let navLogoMetrics = null;

function measureNavLogo() {
  navCenter.style.transform = "none";

  const logoRect = navLogo.getBoundingClientRect();
  const paddingRightPx = parseFloat(getComputedStyle(navLogo).paddingRight) || 0;
  // .top-nav's own horizontal padding is the inset the full-width logo lines
  // up to, so it sits flush with everything else in the nav rather than
  // bleeding to the raw viewport edge.
  const navInsetPx = parseFloat(getComputedStyle(topNav).paddingLeft) || 0;

  navLogoMetrics = {
    left: logoRect.left,
    contentWidth: logoRect.width - paddingRightPx,
    navInsetPx,
  };

  navCenter.style.transform = "";
}

// Scales the logo from full viewport width down to its normal nav size over
// the intro, in lockstep with the row stack's own intro motion (same
// introProgress drives both) — a transform on .nav-center rather than an
// animated width, so the nav's flex layout never reflows and, more
// importantly, so the end of the intro is the exact identity transform: the
// logo lands back on its real resting position rather than on a separately
// computed guess at it, and there's nothing to jump.
//
// transform-origin is left top (style.css), so scaling holds the logo's
// top-left corner at navLogoMetrics.left; the translate then carries that
// same corner out to the nav's left inset. Applied in that order —
// translate written first, so it composes after the scale — the corner ends
// up exactly at navInsetPx regardless of scale.
function updateIntroLogo(introProgress) {
  if (!navLogoMetrics || navLogoMetrics.contentWidth <= 0) return;

  const fullWidthPx = window.innerWidth - navLogoMetrics.navInsetPx * 2;
  const scale = lerp(fullWidthPx / navLogoMetrics.contentWidth, 1, introProgress);
  const shiftPx = lerp(navLogoMetrics.navInsetPx - navLogoMetrics.left, 0, introProgress);

  navCenter.style.transform = `translateX(${shiftPx}px) scale(${scale})`;
}

// Fades the row titles in over the back half of the intro (see
// INTRO_TITLE_FADE_START) via a custom property style.css reads, rather than
// writing opacity onto each title individually — .row-title's own
// .nav-hidden fullscreen fade then still wins on specificity instead of
// fighting an inline style. The body class only exists to drop .row-title's
// opacity transition while this is being driven per scroll frame, and to
// stop the blown-up logo swallowing pointer events (see style.css).
function updateIntroUi(introProgress) {
  const opacity = clamp((introProgress - INTRO_TITLE_FADE_START) / (1 - INTRO_TITLE_FADE_START), 0, 1);
  document.documentElement.style.setProperty("--intro-title-opacity", `${opacity}`);
  document.body.classList.toggle("is-intro", introProgress < 1);
}

// Slides the whole top nav up out of view in exact lockstep with row 0's
// own collapse: rowZeroDistance is the same 0..1 "how collapsed is row 0"
// value getHeights uses to size row 0 itself (0 = fully active, 1 = fully
// shrunk to MIN_VH), so the nav finishes disappearing at exactly the
// scroll point row 0 finishes shrinking, and is fully back at exactly the
// point row 0 is fully active again — nothing about the nav's timing is
// independent of the row stack's own, so the two can't drift apart.
//
// An earlier version drove this off raw scrollY instead, clamped to a
// fixed 300px travel distance — decoupled from the row stack's own
// timeline (which is spread across the page's full scrollable height, not
// a fixed pixel span), so wherever the two didn't happen to line up it
// read as the nav hiding before row 0 visibly moved at all, and lagging
// well behind on the way back up.
//
// No CSS transition here, same as the rows themselves (see update() —
// row.style.transform is set directly every scroll frame with nothing
// transitioning normal scroll-driven movement): this already runs every
// scroll frame, so per-frame position is already smooth without easing on
// top of it, and easing here specifically is what caused the "lags behind"
// half of the desync.
function updateTopNav(rowZeroDistance) {
  const travelPx = topNav.offsetHeight;
  topNav.style.transform = `translateY(${-rowZeroDistance * travelPx}px)`;
}

// Same logic as updateTopNav above, reversed: driven by the *last* row's
// distance instead of row 0's, and a positive translateY (pushed down, off
// the bottom of the viewport) instead of negative — so the footer starts
// hidden below the fold and slides up into view in lockstep with the last
// row becoming active, finishing at rest exactly when that row is fully
// active, same as the top nav does with row 0.
function updateBottomFooter(rowLastDistance) {
  const travelPx = bottomFooter.offsetHeight;
  bottomFooter.style.transform = `translateY(${rowLastDistance * travelPx}px)`;
}

// Pins each row-title's own bottom edge ROW_TITLE_GAP_PX above its row's
// current top edge, recomputed every frame from the same heights/offsets
// update() already computed for the rows themselves — same
// lockstep-with-the-row-stack reasoning as updateTopNav/updateBottomFooter,
// just per row instead of once. A row's top edge, in the same
// viewport-center-relative vh space getOffsets already works in, is
// offsets[index] - heights[index] / 2 (its center minus half its own
// height). The title's own height is a real measured px value (its
// font-size is fixed px, not vh-scaled, same reasoning as topNav/
// bottomFooter's own offsetHeight reads) — mixing vh and px in one calc()
// is fine, same pattern used throughout this file.
//
// Also switches each title between its large (category+count,
// space-between) and small (category only, centered) layout — see
// .row-title.is-small in style.css — based on the same distances[index]
// (0 = row fully active/large, 1 = fully collapsed/small) update() already
// computed. Switches at the halfway point rather than only at distance 0,
// so the shrinking row and the row growing to take its place cross over to
// their new layout at roughly the same scroll moment.
function updateRowTitles(heights, offsets, distances) {
  rowTitles.forEach((titleEl, index) => {
    const rowTopVh = offsets[index] - heights[index] / 2;
    const liftPx = titleEl.offsetHeight + ROW_TITLE_GAP_PX;
    titleEl.style.transform = `translateY(calc(${rowTopVh}vh - ${liftPx}px))`;
    titleEl.classList.toggle("is-small", distances[index] >= 0.5);
  });
}

// Toggles fullscreen for one row — its own active image, clicked again,
// closes it. update() reads fullscreenRowIndex on every call (scroll,
// resize, or this) so it doesn't need its own render path. The
// fullscreen-transition class is added right before that render and
// removed again after FULLSCREEN_TRANSITION_MS, so only this one change
// animates (via the CSS transition it enables) — regular scroll-driven
// updates and in-fullscreen wheel navigation happen outside that window,
// with no class present, so they stay instant. When opening (not closing),
// the column is jumped to the same image that was active in the stack
// right after update() makes it visible, so the row's own grow-to-100vh
// transition reads as zooming into that image rather than landing on
// whatever the column happened to be scrolled to last.
function setFullscreenRow(rowIndex) {
  const opening = fullscreenRowIndex !== rowIndex;
  fullscreenRowIndex = opening ? rowIndex : null;

  rows.forEach((row) => row.classList.add("fullscreen-transition"));
  update();
  if (opening) rowControllers[rowIndex].centerColumnOnActiveImage();
  window.setTimeout(() => {
    rows.forEach((row) => row.classList.remove("fullscreen-transition"));
  }, FULLSCREEN_TRANSITION_MS);
}

function update() {
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;

  const progress = scrollableHeight > 0
    ? clamp(window.scrollY / scrollableHeight, 0, 1)
    : 0;

  const activePosition = getActivePosition(progress);
  const gapVh = getRowGapVh();

  // 0 at the very top of the page (the opening frame), 1 from the moment row
  // 0 is fully active onwards — i.e. how far through the leading intro
  // segment of getActivePosition's timeline the scroll is.
  const introProgress = clamp(activePosition + 1, 0, 1);

  const distances = getDistances(activePosition);
  const heights = getHeights(distances);
  // Pushes the whole stack down so the one visible row sits at the bottom of
  // the screen at the start of the intro, easing back to the normal
  // viewport-centered stack by the end of it. Applied to the offsets rather
  // than to .sticky-viewport as a whole so the row titles, which are
  // positioned from these same offsets, come along with it.
  const introShiftVh = (1 - introProgress) * INTRO_ROW_SHIFT_VH;
  const offsets = getOffsets(heights, activePosition, gapVh).map((offset) => offset + introShiftVh);

  updateIntroLogo(introProgress);
  updateIntroUi(introProgress);

  // distances[0] is 1 at both ends of row 0's life — collapsed below the
  // logo during the intro, and collapsed again once row 1 takes over — but
  // the nav should only slide away for the second of those; during the intro
  // the logo *is* the nav, and it has to stay put. Clamping activePosition
  // to 0..1 gives exactly that: flat 0 (nav at rest) across the whole intro,
  // then row 0's own collapse distance from there on, continuous at the
  // handover point since both are 0 there.
  updateTopNav(clamp(activePosition, 0, 1));
  updateBottomFooter(distances[ROW_COUNT - 1]);
  updateRowTitles(heights, offsets, distances);
  // Fullscreen covers the whole viewport with one image at a time, so the
  // top nav (about/index, logo, filter), bottom footer, and row-titles have
  // nothing left to sit above/below — hide all of them for as long as any
  // row is fullscreen (see .nav-hidden in style.css for the shared fade).
  topNav.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  bottomFooter.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  rowTitles.forEach((titleEl) => titleEl.classList.toggle("nav-hidden", fullscreenRowIndex !== null));

  // The reverse of the above: fullscreen-title has nothing to show *except*
  // while a row is fullscreen, so it fades in instead of out (see
  // .fullscreen-title.is-visible in style.css).
  if (fullscreenRowIndex !== null) {
    const title = ROW_TITLES[fullscreenRowIndex];
    fullscreenTitleType.textContent = title.type;
    fullscreenTitleCat.textContent = title.category;
    fullscreenTitleCount.textContent = title.count;
  }
  fullscreenTitle.classList.toggle("is-visible", fullscreenRowIndex !== null);

  rows.forEach((row, index) => {
    // Fullscreen overrides the normal scroll-driven height/position for
    // just the one row — full viewport height, centered, on top (z-index,
    // since rows share a stacking context and later ones would otherwise
    // paint over an earlier one) — every other row is hidden entirely
    // (opacity + pointer-events, not display: none, so its own layout/state
    // stays intact for when fullscreen closes) rather than left showing
    // through, or clickable, behind it.
    if (fullscreenRowIndex !== null) {
      const isFullscreenRow = index === fullscreenRowIndex;
      row.style.height = isFullscreenRow ? "100vh" : `${heights[index]}vh`;
      row.style.transform = isFullscreenRow ? "translateY(-50%)" : `translateY(calc(-50% + ${offsets[index]}vh))`;
      row.style.opacity = isFullscreenRow ? "1" : "0";
      row.style.pointerEvents = isFullscreenRow ? "" : "none";
      row.style.zIndex = isFullscreenRow ? "1" : "";
      row.classList.toggle("is-fullscreen", isFullscreenRow);

      rowControllers[index].setRowDistance(isFullscreenRow ? 0 : distances[index], isFullscreenRow);
      return;
    }

    row.style.height = `${heights[index]}vh`;
    row.style.transform = `translateY(calc(-50% + ${offsets[index]}vh))`;
    row.style.opacity = "";
    row.style.pointerEvents = "";
    row.style.zIndex = "";
    row.classList.remove("is-fullscreen");

    rowControllers[index].setRowDistance(distances[index], false);
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    update();
    ticking = false;
  });
}

// The logo's resting geometry only changes when layout does, so it's
// remeasured on resize (and again once webfonts land, since .nav-left's
// width — and so where the logo sits — depends on them) rather than per
// scroll frame.
function remeasureAndUpdate() {
  measureNavLogo();
  update();
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", remeasureAndUpdate);
window.addEventListener("load", remeasureAndUpdate);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(remeasureAndUpdate);
}

remeasureAndUpdate();

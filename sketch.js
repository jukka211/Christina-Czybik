// Every visit starts at the top, with the opening intro, even on a reload
// of a page that was scrolled down: browsers restore the old scroll
// position by default, which would land mid-gallery and skip the intro.
// Set before anything reads window.scrollY. The beforeunload reset covers
// browsers that restore the position regardless of scrollRestoration.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("beforeunload", () => window.scrollTo(0, 0));
// Coming back with the browser's back / forward buttons (e.g. from the legal
// page) is a return, not a new visit: no opening intro, straight to the
// gallery (see the end of this file and intro-grid.js). Reloads and new
// visits still get the full intro.
const IS_HISTORY_NAVIGATION =
  (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]?.type) === "back_forward";
// Whether the opening photo grid (intro-grid.js) plays on this visit: not
// on a back / forward return, and not when the page opens straight onto a
// panel (index.html#info, e.g. from the legal page).
const INTRO_GRID_WILL_RUN =
  !IS_HISTORY_NAVIGATION && !/(^#|[+,])(info|index)\b/i.test(window.location.hash);

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
  "20260714_CS_CC_BMFTR_DLR_212.JPG",
  "20230613_CZY_Steinmeier_Ortszeit060 1.jpg",
  "20230329_CZY_Bundestag038.JPG",
  "2023-08-31_CZY_Features009.JPG",
  "20230329_CZY_Bundestag002 1.jpg",
  "20230329_CZY_Bundestag013.JPG",
  "20240816_bundesfoto_CC_Porträts062_Highres.JPG",
  "20240819_bundesfoto_CC_Sicherheitstour_BMI168.JPG",
  "20240917_bundesfoto_CC_BMWK_StartupSummit049.JPEG",
  "20230501_CZY_Bundestag010 1.jpg",
  "20230608_CZY_PV_Anlagen028.JPG",
  "20240313_CZY_Bundestag008.JPG",
  "20240313_CZY_Bundestag017.JPG",
  "20240318_bundesfoto_BMWK_BM_Habeck_HH_226.JPG",
  "20240318_bundesfoto_BMWK_BM_Habeck_HH_244.JPG",
  "20240420_CZY_Steinmeier_Munster010.JPG",
  "20240422_bundesfoto_CC_BMWK_HannoverMesse018.JPG",
  "20240709_bundesfoto_BK_Sommerreise_CC_111.JPG",
  "20240709_bundesfoto_BK_Sommerreise_CC_177.JPG",
  "20240816_bundesfoto_CC_Porträts002_Highres.JPG",
  "20230613_CZY_Steinmeier_Ortszeit006.JPG",
  "20230613_CZY_Steinmeier_Ortszeit057 1.jpg",
  "20231208_CZY_SPD_Bundesparteitag065.JPG",
  "20231209_CZY_SPD_Bundesparteitag046.JPG",
  "20231209_CZY_SPD_Bundesparteitag076.JPG",
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
// Desktop's fixed row sizes. Mobile derives its own from the viewport *width*
// instead (see refreshMetrics), so MAX_VH/MIN_VH — and the image widths
// derived from them below — are `let`s refreshed on every resize rather than
// module constants. Everything downstream still just reads them.
const DESKTOP_MAX_VH = 75;
const DESKTOP_MIN_VH = 6;
let MAX_VH = DESKTOP_MAX_VH;
let MIN_VH = DESKTOP_MIN_VH;
const ROW_GAP_REM = 4;
// Desktop only: the space the row stack keeps clear around itself. The top
// inset clears the Info/Index buttons (their bottom edge is at 34px). The
// three-row frame (small / large / small) is sized to fill exactly what's
// left, see refreshMetrics.
const STACK_INSET_TOP_PX = 44;
const STACK_INSET_SIDE_PX = 10;
const STACK_INSET_BOTTOM_PX = 10;
// How far the stack's center sits below the viewport's, in px, so it's
// centered between the top and bottom insets rather than on the screen.
let stackShiftPx = 0;
// Fixed px gap between a row-title's own top edge and its row's bottom edge
// (see updateRowTitles) — separate from the general inter-row gap above,
// which spaces whole rows from each other regardless of titles.
const ROW_TITLE_GAP_PX = 8;
// A representative landscape aspect ratio (width/height), same convention
// used elsewhere in this project.
const IMG_ASPECT_RATIO = 900 / 588;
let IMG_MAX_WIDTH_VH = MAX_VH * IMG_ASPECT_RATIO;
let IMG_MIN_WIDTH_VH = MIN_VH * IMG_ASPECT_RATIO;

// How many images on each side of the centered one are mounted — 2 gives 5
// total visible per row (2 small + large + 2 small); the rest of
// IMAGE_FILES stays unloaded until scrolled into range.
const DESKTOP_VISIBLE_RANGE = 2;
// Mobile shows one image per row at a time. The single image either side is
// mounted anyway, parked a full row-width out and clipped by .row's overflow,
// so it's already loaded and in place to slide in under a swipe.
const MOBILE_VISIBLE_RANGE = 1;
let VISIBLE_RANGE = DESKTOP_VISIBLE_RANGE;
// A stride between rows' starting file offsets so neighboring rows don't
// show the same images at the same position.
const ROW_FILE_OFFSET_STRIDE = 11;
// Width of the "open fullscreen" click zone, centered on the row — outside
// it, clicking left/right of that center band steps focus instead.
const FULLSCREEN_CLICK_ZONE_VW = 10;
// Mobile's counterpart. At 100 the zone spans the whole row, so any tap opens
// fullscreen and stepping is left to swiping alone — trialling whether phones
// need the left/right tap zones at all. Set back to 10 to restore them.
const MOBILE_FULLSCREEN_CLICK_ZONE_VW = 100;
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

function getIntroRowShiftVh() {
  const bottomVh = isMobile ? INTRO_ROW_BOTTOM_VH : (STACK_INSET_BOTTOM_PX / window.innerHeight) * 100;
  const shiftVh = (stackShiftPx / window.innerHeight) * 100;
  return 50 - bottomVh - MIN_VH / 2 - shiftVh;
}
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

// --- Mobile -----------------------------------------------------------------
// Below this width the stack switches to the phone layout: exactly three
// images on screen — one small above, one large across the full width, one
// small below — with a single image per row instead of a five-image
// horizontal stack, stepped by swiping rather than by clicking left/right.
//
// Matched against the identical media query in style.css through matchMedia
// rather than a bare innerWidth comparison, so JS and CSS can't disagree about
// which mode the page is in right at the boundary (they measure the viewport
// differently once a scrollbar is in play).
const MOBILE_QUERY = window.matchMedia("(max-width: 768px)");
// Breathing room down each side of the screen, so the centered image stops
// just short of the edges instead of running into them. The images are spaced
// a full viewport width apart whatever this is, so it also becomes the gap
// between one image and the next as they slide past under a swipe — twice
// this, one image's padding either side of it.
const MOBILE_SIDE_PADDING_PX = 10;
// The width left over is what the small tier is sized from, so the layout scales
// with the screen rather than with a fixed vh the way desktop's does — but as
// a *height*, converted through the nominal landscape shape, since the small
// images have to share one consistent height whatever their own orientation
// (a portrait thumbnail is simply narrower than a landscape one, not taller).
const MOBILE_SMALL_WIDTH_VW = 28;
// Clear space left between a small image's outer edge and the top/bottom of
// the screen, when the gap is free to honour it — see getRowGapVh, which
// widens past this where it has to in order to keep the *fourth* row off
// screen entirely.
const MOBILE_EDGE_MARGIN_VH = 6;
// Floor for the small tier once a tall image has taken most of the screen
// height for itself. The gap's own floor isn't a constant — see
// mobileMinRowGapVh below, which measures it.
const MOBILE_SMALL_MIN_HEIGHT_VH = 4;
// The narrowest the gap between two rows may get on mobile, measured rather
// than fixed: the gap is also where a row's title lives (updateRowTitles hangs
// it below its row's own bottom edge, ROW_TITLE_GAP_PX clear of it), so it
// can never be tighter than that label plus that clearance at both ends.
// Without it a full-width portrait image squeezes the rows together until
// the label belonging to the row above ends up sitting on the photo. Refreshed in
// refreshMetrics, since the label's height is a real measurement that moves
// with the webfont.
let mobileMinRowGapVh = 2;
// How far *past* the edge of the screen the fourth row is pushed. Landing it
// exactly on the edge is what the gap solves for, and a subpixel of rounding
// either way then decides whether a sliver of a fourth image shows; this is
// the slack that settles the question.
const MOBILE_FOURTH_CLEARANCE_VH = 1;
// Ceiling on the large image's height. Full width is the rule whatever the
// image's shape, but a portrait frame at full width is 1.5 screens wide worth
// of height, and past some point that can't share the viewport with the small
// images either side of it at all — on a tablet-width viewport a full-width
// portrait photo would be taller than the screen itself. Past this it's fitted
// to the height instead and stops short of the side edges. Solved for exactly
// the point where the composition runs out: the large image's own half, plus
// the minimum gap and the smallest the small tier is allowed to get, filling
// the half-screen above and below the centre.
function getMobileLargeMaxHeightVh() {
  return 2 * (50 - mobileMinRowGapVh - MOBILE_SMALL_MIN_HEIGHT_VH);
}
// How far a finger travels before a gesture commits to an axis — under this it
// could still turn out to be either a vertical page scroll or a horizontal
// image swipe, so neither is started.
const TOUCH_AXIS_LOCK_PX = 8;
// Fraction of the row's width a horizontal drag has to cover to count as a
// step, rather than snapping back to the image it started on.
const SWIPE_COMMIT_FRACTION = 0.2;
// Matches the transition on .row.swipe-settle in style.css — the same one-off
// pattern as FULLSCREEN_TRANSITION_MS above: the class is only on for the snap
// at the end of a swipe, so the drag itself still tracks the finger 1:1 and
// every other layout change stays instant.
const SWIPE_SETTLE_MS = 250;
// Touch counterpart to FULLSCREEN_COLUMN_PX_PER_STEP: a drag moves the
// fullscreen column with the finger, so one step is about one image-height of
// travel instead of the much longer throw a wheel wants.
const FULLSCREEN_COLUMN_TOUCH_PX_PER_STEP = 260;
// How far clear of the top of the screen the logo ends up once the intro has
// carried it out of view — see updateIntroLogo's mobile branch.
const MOBILE_LOGO_EXIT_MARGIN_PX = 16;

// Which layout is currently live; set by refreshMetrics, read all over.
let isMobile = false;

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
// The Info/Index buttons (panels.js), hidden during fullscreen along with
// the rest of the nav.
const panelNav = document.getElementById("panelNav");
const viewSwitch = document.getElementById("viewSwitch");
// How far up the Projekte / Kategorien switch sits while the logo is in the
// nav (see updateTopNav): enough to clear the screen entirely, since the
// switch starts 9px down and is 25px tall, and its gray fill would
// otherwise peek in along the top edge.
const VIEW_SWITCH_HIDDEN_OFFSET_PX = 40;
// Which row (if any) is currently shown in fullscreen — set by clicking a
// row's active image, cleared by clicking it again.
let fullscreenRowIndex = null;
// Set while fullscreen shows a project from the Index instead of the row's
// own photos (see openProjectFullscreen): which row lent itself for it, and
// the title to show in place of the row's.
let projectFullscreen = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mod(value, total) {
  return ((value % total) + total) % total;
}

// Resolves every viewport-dependent size for the screen the page is currently
// on. Desktop keeps the fixed vh sizes it always had; mobile derives them from
// the viewport width instead, so the centered image lands exactly full-bleed
// and the small ones scale with it. Called from remeasureAndUpdate — on load,
// on resize/rotate, and once webfonts settle — so nothing downstream has to
// know which mode it's in, only to read MAX_VH/MIN_VH/VISIBLE_RANGE/... as
// before.
function refreshMetrics() {
  isMobile = MOBILE_QUERY.matches;

  if (isMobile) {
    // Measured before anything else, because every size below is bounded by
    // it — see getMobileLargeMaxHeightVh and getMobileSmallHeightVh.
    const titleHeightPx = rowTitles[0] ? rowTitles[0].offsetHeight : 0;
    mobileMinRowGapVh = ((titleHeightPx + ROW_TITLE_GAP_PX * 2) / window.innerHeight) * 100;

    // Mobile has no single large size any more — each row is as tall as its
    // own active image, and a portrait one is more than twice a landscape
    // one's height. These two are only the nominal landscape-shaped defaults,
    // used where no particular image is in question and as the starting point
    // update() adapts MIN_VH from every frame.
    MAX_VH = getMobileLargeHeightVh(IMG_ASPECT_RATIO);
    MIN_VH = getMobileSmallHeightVh(MAX_VH);
    VISIBLE_RANGE = MOBILE_VISIBLE_RANGE;
    stackShiftPx = 0;
  } else {
    // Scales the design's 75vh / 6vh rows so the three-row frame (one large
    // row, a small one either side, two gaps) spans exactly the space between
    // the top and bottom insets.
    const rootFontSizePx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gapPx = ROW_GAP_REM * rootFontSizePx;
    const availablePx = window.innerHeight - STACK_INSET_TOP_PX - STACK_INSET_BOTTOM_PX;
    const frameVh = DESKTOP_MAX_VH + DESKTOP_MIN_VH * 2;
    const scale = Math.max((availablePx - gapPx * 2) / ((frameVh / 100) * window.innerHeight), 0.1);

    MAX_VH = DESKTOP_MAX_VH * scale;
    MIN_VH = DESKTOP_MIN_VH * scale;
    VISIBLE_RANGE = DESKTOP_VISIBLE_RANGE;
    stackShiftPx = (STACK_INSET_TOP_PX - STACK_INSET_BOTTOM_PX) / 2;
  }

  // Read by .row / .row-title in style.css.
  stickyViewport.style.setProperty("--stack-shift", `${stackShiftPx}px`);
  stickyViewport.style.setProperty("--stack-side", `${isMobile ? 0 : STACK_INSET_SIDE_PX}px`);
  // Where the bottom row starts, read by the Info panel (panels.css) so it
  // can end just above it. On the root element, since the panel sits
  // outside .sticky-viewport.
  document.documentElement.style.setProperty(
    "--stack-bottom-row-top",
    `calc(${STACK_INSET_BOTTOM_PX}px + ${MIN_VH}vh)`,
  );

  IMG_MAX_WIDTH_VH = MAX_VH * IMG_ASPECT_RATIO;
  IMG_MIN_WIDTH_VH = MIN_VH * IMG_ASPECT_RATIO;
}

// Each row treats IMAGE_FILES as an infinite, wrapping strip — poolIndex is
// a plain unbounded integer (it just keeps counting up/down as you click
// further in either direction) and only the filename lookup wraps, via mod.
// rowIndex offsets where each row starts in that strip, purely for variety.
//
// A row can also be handed its own short list of files for a while (see
// setRowFiles below — the Index panel does this to preview one project in
// the bottom row). That list wraps the same way, offset so its first file
// is the leftmost one mounted rather than the centered one.
const rowFileOverrides = new Array(ROW_COUNT).fill(null);

function getRowFileName(rowIndex, poolIndex) {
  const override = rowFileOverrides[rowIndex];
  if (override) return override[mod(poolIndex + VISIBLE_RANGE, override.length)];
  return IMAGE_FILES[mod(poolIndex + rowIndex * ROW_FILE_OFFSET_STRIDE, IMAGE_FILES.length)];
}

// Every photo's real shape (width/height), learned from the browser as each
// one loads and kept by file name so a remount never waits for it twice. The
// pool is two orientations — a 3:2 landscape frame and a 2:3 portrait one —
// and on mobile they are laid out as what they are: both span the screen's
// full width, which makes the portrait ones more than twice as tall.
//
// IMG_ASPECT_RATIO stands in until the real shape is known. On desktop that
// stand-in is the only ratio ever used: the layout there is a grid of
// identically shaped boxes with object-fit: contain fitting each photo inside
// its own, which is exactly what makes a portrait photo come out small there.
const imageAspects = new Map();

function getImageAspect(fileName) {
  return imageAspects.get(fileName) ?? IMG_ASPECT_RATIO;
}

// Records a photo's shape the moment the browser knows it, and restacks if
// that shape is news — on mobile a row is exactly as tall as the image it's
// showing, so the first load of a portrait frame really does change the
// layout around it.
function recordImageAspect(fileName, img) {
  if (!img.naturalWidth || !img.naturalHeight) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  if (imageAspects.get(fileName) === aspect) return;
  imageAspects.set(fileName, aspect);
  scheduleUpdate();
}

// Mounts one image and wires it up to report its shape back. Shared by the
// in-row stack and the fullscreen column, which mount from the same pool.
// While the opening grid plays, the gallery behind it is hidden, but its
// full-size photos (1-3MB each) would still download and crowd out the
// grid's tiny ones. So until gallery.releaseImages() (called when the grid
// ends) photos are only noted, not fetched. A fallback releases them anyway
// in case the grid never gets that far.
let galleryImagesHeld = INTRO_GRID_WILL_RUN;
const heldImages = [];

function releaseGalleryImages() {
  if (!galleryImagesHeld) return;
  galleryImagesHeld = false;
  heldImages.splice(0).forEach(({ img, src }) => {
    img.src = src;
  });
}

if (galleryImagesHeld) window.setTimeout(releaseGalleryImages, 15000);

function createPoolImage(rowIndex, poolIndex) {
  const fileName = getRowFileName(rowIndex, poolIndex);
  const img = document.createElement("img");
  const src = `images/${encodeURIComponent(fileName)}`;
  if (galleryImagesHeld) heldImages.push({ img, src });
  else img.src = src;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("load", () => recordImageAspect(fileName, img));
  // A cached image can already be decoded by the time the listener above is
  // attached, in which case its load event has been and gone.
  if (img.complete) recordImageAspect(fileName, img);
  return img;
}

// The width a full-width image actually gets, in vh — the viewport less the
// padding down each side. Mobile sizes the large tier by width while every
// other measurement in this file is in vh, and this is where the two meet.
function getMobileFullWidthVh() {
  const widthPx = document.documentElement.clientWidth - MOBILE_SIDE_PADDING_PX * 2;
  return (Math.max(widthPx, 1) / window.innerHeight) * 100;
}

// The large tier on mobile: the image spans the screen's full width whatever
// its shape, so its height is simply whatever that width implies — around
// 30vh for a landscape frame, better than twice that for a portrait one. See
// getMobileLargeMaxHeightVh for the one case that can't be honoured.
function getMobileLargeHeightVh(aspect) {
  return Math.min(getMobileFullWidthVh() / aspect, getMobileLargeMaxHeightVh());
}

// The small tier's height, shared by every small image on screen regardless of
// its own shape. It wants its design size — the height a MOBILE_SMALL_WIDTH_VW
// -wide landscape frame has, which is what the small images have always been —
// but a portrait image in the middle takes so much more of the screen height
// than a landscape one that on a shorter phone there is simply less room left
// over, and the small tier gives way rather than being pushed off the screen.
function getMobileSmallHeightVh(activeLargeHeightVh) {
  const designVh = (getMobileFullWidthVh() * (MOBILE_SMALL_WIDTH_VW / 100)) / IMG_ASPECT_RATIO;
  const roomVh = 50 - activeLargeHeightVh / 2 - mobileMinRowGapVh - MOBILE_EDGE_MARGIN_VH;
  return clamp(roomVh, MOBILE_SMALL_MIN_HEIGHT_VH, designVh);
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
  // Live horizontal finger travel during a mobile swipe (px, positive =
  // dragged right), folded into applyLayout's mobile branch so the images
  // track the finger; back to 0 the moment the gesture ends.
  let dragOffsetPx = 0;
  // Set by any touch gesture that actually moved, consumed by the click
  // handler below: a swipe (or a fullscreen drag) still ends in a synthetic
  // click on touch devices, and without this that click would step the row —
  // or close fullscreen — on top of whatever the gesture already did.
  let suppressNextClick = false;
  let settleTimeoutId = null;
  const mounted = new Map(); // poolIndex -> img element

  // Mobile only (hidden on desktop by style.css): an arrow pinned inside the
  // current image's right edge, telling you the row swipes. Tapping it steps
  // to the next image, the same as swiping would.
  const swipeHint = document.createElement("button");
  swipeHint.type = "button";
  swipeHint.className = "row-swipe-hint";
  swipeHint.setAttribute("aria-label", "Next image");
  swipeHint.innerHTML = '<img src="arrow.svg" alt="">';
  swipeHint.addEventListener("click", (event) => {
    event.stopPropagation();
    row.classList.remove("is-pressed");
    activeIndex += 1;
    dismissSwipeHint();
    commitActiveIndex();
  });
  row.appendChild(swipeHint);

  // Sizes and places one image in mobile's one-image-per-row layout. Each is
  // sized from its own shape rather than fitted into a shared box, so a
  // portrait frame is as wide as a landscape one and simply taller; collapsing
  // toward MIN_VH as the row loses focus keeps that true at the small end too,
  // where every image shares one height and widths follow their own shapes
  // from there. Images sit a full row-width apart, which puts the neighbours
  // just off screen — MOBILE_SIDE_PADDING_PX clear of the one on screen, since
  // each is that much narrower than the row.
  function styleMobileImage(img, poolIndex, rowWidthPx) {
    const aspect = getImageAspect(getRowFileName(rowIndex, poolIndex));
    const heightVh = lerp(getMobileLargeHeightVh(aspect), MIN_VH, rowDistance);
    img.style.height = `${heightVh}vh`;
    img.style.width = `${heightVh * aspect}vh`;
    const offsetPx = (poolIndex - activeIndex) * rowWidthPx + dragOffsetPx;
    img.style.transform = `translate(calc(-50% + ${offsetPx}px), -50%)`;
  }

  // Rides the current image's right edge, SWIPE_HINT_INSET_PX inside it
  // (dragged along with it mid-swipe), and fades out as the row collapses,
  // so only the large row carries one.
  function placeSwipeHint() {
    const aspect = getImageAspect(getRowFileName(rowIndex, activeIndex));
    const widthPx = lerp(getMobileLargeHeightVh(aspect), MIN_VH, rowDistance) * aspect * (window.innerHeight / 100);
    const rightEdgePx = widthPx / 2 + dragOffsetPx;
    swipeHint.style.transform = `translate(calc(${rightEdgePx - SWIPE_HINT_INSET_PX}px - 100%), -50%)`;
    swipeHint.style.opacity = `${clamp(1 - rowDistance * 2, 0, 1)}`;
    swipeHint.style.visibility = rowDistance >= 0.5 ? "hidden" : "";
  }

  function applyLayout() {
    const coreMin = activeIndex - VISIBLE_RANGE;
    const coreMax = activeIndex + VISIBLE_RANGE;

    mounted.forEach((img, poolIndex) => {
      if (poolIndex >= coreMin && poolIndex <= coreMax) return;
      img.remove();
      mounted.delete(poolIndex);
    });

    // Read before anything new is mounted, not after. It's a single cheap
    // read either way — it's the row's own box, set from outside by the
    // vertical stack, so it doesn't depend on anything this function itself
    // writes — but taking it first means a freshly created image can be put
    // in its right place *before* it enters the document. Otherwise this read
    // flushes style with that image in the document and still untransformed,
    // which parks it at the row's centre (left: 50%, no transform yet) for one
    // resolved style; the position set a moment later then becomes something
    // to transition *from*, and during a swipe's settle window the image
    // visibly flies out to its place from the middle of the screen.
    //
    // Sizes are set in vh, but spreading images across the row's actual width
    // needs both in the same unit, hence the vh->px rate alongside it.
    const vhToPx = window.innerHeight / 100;
    const rowWidthPx = row.clientWidth;

    for (let i = coreMin; i <= coreMax; i += 1) {
      if (mounted.has(i)) continue;
      const img = createPoolImage(rowIndex, i);
      if (isMobile) styleMobileImage(img, i, rowWidthPx);
      row.appendChild(img);
      mounted.set(i, img);
    }

    // Mobile shows one image per row, so there's no horizontal stack to
    // spread: every mounted image takes the centered one's size and they're
    // laid out on a full-row-width pitch, which parks the neighbours exactly
    // one screen out either side, clipped by .row's overflow until a swipe
    // drags them in. dragOffsetPx is the live finger travel — 0 whenever
    // nothing is being dragged, so this is also the resting layout.
    if (isMobile) {
      mounted.forEach((img, poolIndex) => styleMobileImage(img, poolIndex, rowWidthPx));
      placeSwipeHint();
      return;
    }

    const sizes = new Map();
    mounted.forEach((img, poolIndex) => {
      const size = getImageSize(poolIndex - activeIndex, rowDistance);
      sizes.set(poolIndex, size);
      img.style.width = `${size.width}vh`;
      img.style.height = `${size.height}vh`;
    });

    // True space-between: the leftover width (row width minus the images'
    // own widths) is divided evenly into the gaps between them, so they
    // spread across the row's full width instead of clustering with a small
    // fixed gap — same idea as getCenters() in HomePageClient.tsx, just with
    // a space-between gap instead of a flat one, and in px instead of vh/vw.
    // Returns each image's center relative to the active one's.
    function spreadAcrossRow(indices) {
      const totalWidthPx = indices.reduce((sum, i) => sum + sizes.get(i).width * vhToPx, 0);
      const gapPx = Math.max(0, (rowWidthPx - totalWidthPx) / Math.max(indices.length - 1, 1));
      const centers = new Map();
      let cursor = 0;
      indices.forEach((poolIndex) => {
        const widthPx = sizes.get(poolIndex).width * vhToPx;
        centers.set(poolIndex, cursor + widthPx / 2);
        cursor += widthPx + gapPx;
      });
      const focusCenter = centers.get(activeIndex) ?? 0;
      centers.forEach((center, poolIndex) => centers.set(poolIndex, center - focusCenter));
      return centers;
    }

    // Two arrangements, blended by rowDistance. A collapsed row shows all 5
    // mounted images spread edge to edge. The active (middle) row shows only
    // 3 (one small left, the large one, one small right), with the outer two
    // pushed just past the row's edges, where .row's overflow clips them.
    // They also fade with the blend, so a row growing into the middle slides
    // its outer images out rather than dropping them at some scroll point.
    const orderedIndices = Array.from(mounted.keys()).sort((a, b) => a - b);
    const innerIndices = orderedIndices.filter((i) => Math.abs(i - activeIndex) <= 1);
    const collapsedCenters = spreadAcrossRow(orderedIndices);
    const activeCenters = spreadAcrossRow(innerIndices);

    mounted.forEach((img, poolIndex) => {
      const isOuter = Math.abs(poolIndex - activeIndex) > 1;
      const activeCenter = isOuter
        ? Math.sign(poolIndex - activeIndex) * (rowWidthPx / 2 + (sizes.get(poolIndex).width * vhToPx) / 2)
        : activeCenters.get(poolIndex);
      const offset = lerp(activeCenter, collapsedCenters.get(poolIndex), rowDistance);
      img.style.transform = `translate(calc(-50% + ${offset}px), -50%)`;
      img.style.opacity = isOuter ? `${rowDistance}` : "";
    });
  }

  // "center" = the narrow FULLSCREEN_CLICK_ZONE_VW band (mobile:
  // MOBILE_FULLSCREEN_CLICK_ZONE_VW) that opens fullscreen; otherwise
  // "left"/"right" by which half of the row the pointer is on. Shared
  // between the click handler and the cursor hover-feedback below, so they
  // always agree on where the zones are.
  function getZone(event) {
    const rect = row.getBoundingClientRect();
    const rowCenterX = rect.left + rect.width / 2;
    const zoneVw = isMobile ? MOBILE_FULLSCREEN_CLICK_ZONE_VW : FULLSCREEN_CLICK_ZONE_VW;
    const fullscreenZoneHalfWidthPx = (zoneVw / 100) * window.innerWidth / 2;

    if (Math.abs(event.clientX - rowCenterX) <= fullscreenZoneHalfWidthPx) return "center";
    return event.clientX - rect.left < rect.width / 2 ? "left" : "right";
  }

  // Outside fullscreen: clicking the center zone opens it; clicking
  // left/right of it steps focus that direction instead. Inside
  // fullscreen: navigation is by mouse wheel (below), not click, so any
  // click just closes it.
  row.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

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
    commitActiveIndex();
  });

  // Desktop's rows are the same height whichever image is active, so stepping
  // only has to re-lay out this one row. Mobile's aren't — a row is as tall as
  // its active image — so the whole stack has to re-space itself around the
  // new height.
  function commitActiveIndex() {
    if (isMobile) update();
    else applyLayout();
  }

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

  // Mobile's stand-in for the left/right click zones: drag the row sideways
  // and its images follow the finger 1:1; release past SWIPE_COMMIT_FRACTION
  // of the row's width and it steps to that neighbour, release short of it and
  // it snaps back to where it started. Only the release is animated (see
  // settleSwipe and .row.swipe-settle in style.css) — the drag itself is
  // direct, and everything else in this file stays instant as before.
  //
  // The axis is locked once, on the first TOUCH_AXIS_LOCK_PX of travel, and
  // never revisited for the rest of the gesture: a mostly-vertical drag is
  // handed straight back to the page's own scrolling (never preventDefault'ed)
  // and a mostly-horizontal one never lets the page scroll out from under it.
  // .row's touch-action: pan-y pinch-zoom (style.css) is what lets both of
  // those be true at once — the browser never claims a horizontal drag, so
  // preventDefault here isn't fighting a scroll it already started.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchAxis = null; // null until locked, then "x" or "y"

  // Lets the one transform change at the end of a swipe animate, then takes
  // the transition back off — same reasoning as setFullscreenRow's use of
  // .fullscreen-transition, and re-armed rather than stacked if a second
  // swipe lands inside the first one's window.
  // Applied to every row and title, not just this one: committing a swipe can
  // change how tall this row is (a landscape frame handing over to a portrait
  // one), and that re-spaces the rows above and below it too. Same
  // borrowed-for-a-beat shape as setFullscreenRow's .fullscreen-transition,
  // re-armed rather than stacked if a second swipe lands inside the window.
  function settleSwipe() {
    const settling = [...rows, ...rowTitles];
    settling.forEach((el) => el.classList.add("swipe-settle"));
    window.clearTimeout(settleTimeoutId);
    settleTimeoutId = window.setTimeout(() => {
      settling.forEach((el) => el.classList.remove("swipe-settle"));
    }, SWIPE_SETTLE_MS);
  }

  function endSwipe() {
    const wasSwiping = touchAxis === "x";
    touchAxis = null;
    if (!wasSwiping) return;

    const threshold = row.clientWidth * SWIPE_COMMIT_FRACTION;
    if (dragOffsetPx <= -threshold) activeIndex += 1;
    else if (dragOffsetPx >= threshold) activeIndex -= 1;
    if (Math.abs(dragOffsetPx) >= threshold) dismissSwipeHint();

    dragOffsetPx = 0;
    settleSwipe();
    update();
  }

  row.addEventListener(
    "touchstart",
    (event) => {
      // Unconditional, and before the guards below: every gesture starts here,
      // including one on the fullscreen column (a descendant of this row), so
      // this is the one place that can guarantee a stale suppressNextClick
      // from an interrupted gesture never swallows a later real tap.
      suppressNextClick = false;
      touchAxis = null;
      if (!isMobile || isFullscreen || event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      // Tap feedback (.row.is-pressed in style.css): on from the first touch,
      // dropped as soon as the gesture turns out to be a swipe or a scroll,
      // otherwise held until the tap's click opens fullscreen.
      row.classList.add("is-pressed");
    },
    { passive: true },
  );

  row.addEventListener(
    "touchmove",
    (event) => {
      if (!isMobile || isFullscreen || touchAxis === "y" || event.touches.length !== 1) return;

      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;

      if (touchAxis === null) {
        if (Math.abs(dx) < TOUCH_AXIS_LOCK_PX && Math.abs(dy) < TOUCH_AXIS_LOCK_PX) return;
        touchAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        row.classList.remove("is-pressed");
        if (touchAxis === "y") return;
      }

      event.preventDefault();
      suppressNextClick = true;
      dragOffsetPx = dx;
      // Not applyLayout() alone: this row's height tracks the drag too, and
      // that moves every other row in the stack with it.
      scheduleUpdate();
    },
    { passive: false },
  );

  row.addEventListener("touchend", endSwipe);
  row.addEventListener("touchcancel", () => {
    row.classList.remove("is-pressed");
    endSwipe();
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
      const img = createPoolImage(rowIndex, i);
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
      // Same two-tier sizing as the in-row stack above, and the same split
      // between the platforms: mobile lays every photo out at its own shape,
      // desktop fits them all into one landscape-shaped box.
      const size = isMobile
        ? (() => {
            const aspect = getImageAspect(getRowFileName(rowIndex, poolIndex));
            const height = lerp(getMobileLargeHeightVh(aspect), MIN_VH, distance);
            return { width: height * aspect, height };
          })()
        : { width: lerp(IMG_MAX_WIDTH_VH, IMG_MIN_WIDTH_VH, distance), height: lerp(MAX_VH, MIN_VH, distance) };
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

  // The touch counterpart to that wheel handler — without it fullscreen would
  // be a dead end on a phone, since a touch device never fires wheel and the
  // column has no scroll container of its own to fall back on. Same
  // translation into columnScrollUnits, just measured incrementally from the
  // previous touchmove rather than from the start of the gesture, and with the
  // sign flipped so dragging the images up moves on to the next one — the
  // direction the content itself travels, which is also what a wheel-down
  // does. .row-column's touch-action: pinch-zoom (style.css) is what keeps the
  // page parked underneath from scrolling while this runs.
  let columnTouchY = 0;
  let columnTouchTravelPx = 0;

  column.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
      columnTouchY = event.touches[0].clientY;
      columnTouchTravelPx = 0;
    },
    { passive: true },
  );

  column.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) return;
      event.preventDefault();

      const y = event.touches[0].clientY;
      const dy = y - columnTouchY;
      columnTouchY = y;

      // Only a real drag suppresses the click that closes fullscreen; the
      // stray pixel or two of travel in an ordinary tap should still close it.
      columnTouchTravelPx += Math.abs(dy);
      if (columnTouchTravelPx > TOUCH_AXIS_LOCK_PX) suppressNextClick = true;

      columnScrollUnits -= (dy / FULLSCREEN_COLUMN_TOUCH_PX_PER_STEP) * COLUMN_STEP_WEIGHT;
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
    // The height this row's own active image wants at full size — what the
    // outer stack sizes the row to on mobile, where a row is exactly as tall
    // as the single image it shows. Mid-swipe it glides between the outgoing
    // image's height and the incoming one's in step with the drag, so a
    // landscape frame handing over to a portrait one grows into it under the
    // finger instead of jumping the whole stack at the end of the gesture.
    getLargeHeightVh() {
      const current = getMobileLargeHeightVh(getImageAspect(getRowFileName(rowIndex, activeIndex)));
      if (dragOffsetPx === 0) return current;

      const progress = clamp(Math.abs(dragOffsetPx) / (row.clientWidth || 1), 0, 1);
      const incomingIndex = activeIndex + (dragOffsetPx < 0 ? 1 : -1);
      const incoming = getMobileLargeHeightVh(getImageAspect(getRowFileName(rowIndex, incomingIndex)));
      return lerp(current, incoming, progress);
    },
    centerColumnOnActiveImage,
    getActiveIndex() {
      return activeIndex;
    },
    // Drops every mounted image so the next layout pass mounts fresh ones
    // from whatever getRowFileName now returns — used when the row's file
    // list is swapped out from under it (see setRowFiles).
    remount() {
      mounted.forEach((img) => img.remove());
      mounted.clear();
      columnMounted.forEach((img) => img.remove());
      columnMounted.clear();
      applyLayout();
    },
    // Every size applyColumnLayout writes is viewport-derived, so a resize or
    // rotation while fullscreen is open has to re-run it — see
    // remeasureAndUpdate, the one caller. Normal scroll frames deliberately
    // don't (setRowDistance below explains why).
    refreshColumnLayout: applyColumnLayout,
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
// place is a placeholder too.
const ROW_TITLES = [
  { type: "Kat.", category: "Politik", place: "Ort", count: "01/75" },
  { type: "Kat.", category: "Veranstaltung", place: "Ort", count: "01/75" },
  { type: "Kat.", category: "Social Media", place: "Ort", count: "01/75" },
  { type: "Kat.", category: "Porträt", place: "Ort", count: "01/75" },
  { type: "Kat.", category: "Reportage", place: "Ort", count: "01/75" },
];

// Gap between the swipe hint and the right edge of the image it sits on.
const SWIPE_HINT_INSET_PX = 4;

// Mobile's swipe hint (.row-swipe-hint in style.css) is shown until the first
// swipe anywhere on the page actually moves a row on; then it's gone from
// every row for good (until the next page load).
function dismissSwipeHint() {
  document.body.classList.add("swipe-hint-dismissed");
}

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
  //
  // The count and "Mehr" share the right-hand slot: desktop shows the count,
  // mobile swaps in "Mehr" — a second way into this row's fullscreen besides
  // tapping the row itself (see .row-title-more in style.css).
  const rowTitle = document.createElement("div");
  rowTitle.className = "row-title";
  const title = ROW_TITLES[rowIndex];
  rowTitle.innerHTML = `<span class="row-title-pair"><span class="row-title-type">${title.type}:</span><span class="row-title-cat">${title.category}</span></span><span class="row-title-pair"><span class="row-title-place">${title.place}</span><span class="row-title-count">${title.count}</span><button type="button" class="row-title-more">Mehr</button></span>`;
  rowTitle.querySelector(".row-title-more").addEventListener("click", () => {
    if (fullscreenRowIndex === null) setFullscreenRow(rowIndex);
  });
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
  const segments = introRemoved ? [] : [{ weight: INTRO_WEIGHT, from: -1, to: 0 }];
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

// Desktop's rows all grow to the same MAX_VH, because every image there is
// fitted into an identically shaped box. Mobile's don't: a row is exactly as
// tall as its own active image, so a row showing a portrait frame is more than
// twice the height of one showing a landscape frame, and the stack has to be
// spaced around each row's real height rather than a single shared one.
function getHeights(distances) {
  if (!isMobile) return distances.map((distance) => lerp(MAX_VH, MIN_VH, distance));
  return distances.map((distance, index) => lerp(rowControllers[index].getLargeHeightVh(), MIN_VH, distance));
}

// The large-tier height the stack is currently centred on. On mobile that
// varies row by row, so this glides between the two rows straddling
// activePosition exactly the way getOffsets' own focus point does — no
// discrete switch as one row hands over to the next, and so no jump in
// anything derived from it (the small tier's height, the gap between rows).
function getActiveLargeHeightVh(activePosition) {
  if (!isMobile) return MAX_VH;

  const floorIndex = clamp(Math.floor(activePosition), 0, ROW_COUNT - 1);
  const ceilIndex = clamp(Math.ceil(activePosition), 0, ROW_COUNT - 1);
  const frac = activePosition - Math.floor(activePosition);
  return lerp(rowControllers[floorIndex].getLargeHeightVh(), rowControllers[ceilIndex].getLargeHeightVh(), frac);
}

// Desktop: ROW_GAP_REM converted to vh, so the gap stays a fixed rem distance
// regardless of viewport height even though the stacking math works in vh
// throughout.
//
// Mobile: not a fixed distance at all, but whatever spaces the stack into the
// three images the phone layout is defined as. Two things want a say, and the
// wider of them wins:
//
//   pinGap  puts the small neighbours' outer edges MOBILE_EDGE_MARGIN_VH
//           inside the top and bottom of the screen;
//   hideGap is the narrowest gap that still pushes the row *past* those — the
//           fourth image — fully off screen (its near edge lands exactly at
//           the viewport edge, and since that leaves the third image's own far
//           edge at 50 - hideGap, it can never crowd it out).
//
// On a phone pinGap is the wider one and the smalls sit at the margin; on a
// wide, short screen the large image is half the viewport tall and hideGap
// takes over, spacing the stack out until the fourth image clears the edge.
function getRowGapVh(activeLargeHeightVh = MAX_VH) {
  if (isMobile) {
    const halfVh = activeLargeHeightVh / 2;
    const pinGap = 50 - MOBILE_EDGE_MARGIN_VH - halfVh - MIN_VH;
    const hideGap = (50 + MOBILE_FOURTH_CLEARANCE_VH - halfVh - MIN_VH) / 2;
    return Math.max(mobileMinRowGapVh, pinGap, hideGap);
  }

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
    top: logoRect.top,
    contentWidth: logoRect.width - paddingRightPx,
    // Mobile's motion is vertical rather than a scale, so it needs the drawn
    // height where desktop needs the drawn width.
    height: logoRect.height,
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

  // Mobile's logo has nowhere in the nav to land — the three links fill that
  // row at this width — so there's no scale to run and nothing to land on. It
  // is simply as wide as the screen allows (see .nav-logo in the phone layout),
  // starts centred on the screen, and slides up and off the top over the
  // intro, handing the screen to the first row of photographs. Only Y is
  // touched: the wordmark is centred by its own box, so leaving X alone is
  // exactly what keeps it from drifting sideways on the way out.
  if (isMobile) {
    const centreY = window.innerHeight / 2 - navLogoMetrics.height / 2;
    const exitY = -navLogoMetrics.height - MOBILE_LOGO_EXIT_MARGIN_PX;
    navCenter.style.transform = `translateY(${lerp(centreY, exitY, introProgress)}px)`;
    return;
  }

  const fullWidthPx = window.innerWidth - navLogoMetrics.navInsetPx * 2;
  const fullScale = fullWidthPx / navLogoMetrics.contentWidth;
  const scale = lerp(fullScale, 1, introProgress);
  const shiftPx = lerp(navLogoMetrics.navInsetPx - navLogoMetrics.left, 0, introProgress);
  // At full width the logo starts vertically centered on the screen (Figma
  // 39:2), then rises to its place in the nav as it shrinks.
  const centeredTopPx = window.innerHeight / 2 - (navLogoMetrics.height * fullScale) / 2;
  const shiftYPx = lerp(centeredTopPx - navLogoMetrics.top, 0, introProgress);

  navCenter.style.transform = `translate(${shiftPx}px, ${shiftYPx}px) scale(${scale})`;
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
  // The Projekte / Kategorien switch takes the logo's place: it waits
  // VIEW_SWITCH_HIDDEN_OFFSET_PX up, above the top edge, while the logo is
  // showing, and slides down into its place as the logo slides out.
  if (viewSwitch) {
    viewSwitch.style.transform = `translateY(${-(1 - rowZeroDistance) * VIEW_SWITCH_HIDDEN_OFFSET_PX}px)`;
  }
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

// Pins each row-title's own top edge ROW_TITLE_GAP_PX below its row's
// current bottom edge, recomputed every frame from the same heights/offsets
// update() already computed for the rows themselves — same
// lockstep-with-the-row-stack reasoning as updateTopNav/updateBottomFooter,
// just per row instead of once. A row's bottom edge, in the same
// viewport-center-relative vh space getOffsets already works in, is
// offsets[index] + heights[index] / 2 (its center plus half its own
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
    const rowBottomVh = rowTopVh + heights[index];
    titleEl.style.transform = `translateY(calc(${rowBottomVh}vh + ${ROW_TITLE_GAP_PX}px))`;
    titleEl.classList.toggle("is-small", distances[index] >= 0.5);
    // Mobile only, and only for a row that is *entirely* off screen: the
    // three-image layout packs the stack tightly enough that a row parked
    // just past the top edge would otherwise show its title just above the
    // first image, since a title sits below its own row. Desktop's stack is
    // spaced loosely enough for this never to arise.
    titleEl.classList.toggle("is-offscreen", isMobile && (rowTopVh >= 50 || rowBottomVh <= -50));
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
  // Closing a project's fullscreen hands the row back its own photos, once
  // the close animation (which still shows the project's) has finished.
  const endingProject = !opening && projectFullscreen;
  if (endingProject) projectFullscreen = null;

  rows.forEach((row) => {
    row.classList.add("fullscreen-transition");
    row.classList.remove("is-pressed");
  });
  update();
  if (opening) rowControllers[rowIndex].centerColumnOnActiveImage();
  window.setTimeout(() => {
    rows.forEach((row) => row.classList.remove("fullscreen-transition"));
    if (endingProject && fullscreenRowIndex !== endingProject.rowIndex) {
      rowFileOverrides[endingProject.rowIndex] = null;
      rowControllers[endingProject.rowIndex].remount();
    }
  }, FULLSCREEN_TRANSITION_MS);
}

// Opens fullscreen on one project's photos (clicked in the Index panel,
// panels.js), until projects get pages of their own. The row currently in
// the middle lends itself for it: its file list is swapped for the
// project's, lined up so fullscreen starts on the project's first photo.
function openProjectFullscreen(project) {
  if (!project || !project.images || !project.images.length) return;
  const rowIndex = clamp(Math.round(lastActivePosition), 0, ROW_COUNT - 1);
  const files = project.images;
  // getRowFileName reads the list at poolIndex + VISIBLE_RANGE, and
  // fullscreen opens on the row's activeIndex, so rotate the list to put
  // files[0] exactly there.
  const offset = rowControllers[rowIndex].getActiveIndex() + VISIBLE_RANGE;
  rowFileOverrides[rowIndex] = files.map((_, k) => files[mod(k - offset, files.length)]);
  rowControllers[rowIndex].remount();

  projectFullscreen = {
    rowIndex,
    title: {
      type: project.project,
      category: project.category,
      count: `${String(files.length).padStart(2, "0")} Bilder`,
    },
  };
  setFullscreenRow(rowIndex);
}

function update() {
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;

  const progress = scrollableHeight > 0
    ? clamp(window.scrollY / scrollableHeight, 0, 1)
    : 0;

  const activePosition = getActivePosition(progress);
  if (maybeRemoveIntro(activePosition)) {
    update();
    return;
  }
  lastActivePosition = activePosition;
  // Mobile only: a portrait image in the middle takes so much more of the
  // screen's height than a landscape one that the small tier has to be
  // resolved against whatever is actually centred right now, not once at
  // startup. Everything below — heights, the gap, the intro shift — reads
  // MIN_VH, so this is the single place it's decided.
  const activeLargeHeightVh = getActiveLargeHeightVh(activePosition);
  if (isMobile) MIN_VH = getMobileSmallHeightVh(activeLargeHeightVh);
  const gapVh = getRowGapVh(activeLargeHeightVh);

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
  const introShiftVh = (1 - introProgress) * getIntroRowShiftVh();
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
  if (panelNav) panelNav.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  bottomFooter.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  rowTitles.forEach((titleEl) => titleEl.classList.toggle("nav-hidden", fullscreenRowIndex !== null));

  // The reverse of the above: fullscreen-title has nothing to show *except*
  // while a row is fullscreen, so it fades in instead of out (see
  // .fullscreen-title.is-visible in style.css).
  if (fullscreenRowIndex !== null) {
    const title = projectFullscreen ? projectFullscreen.title : ROW_TITLES[fullscreenRowIndex];
    fullscreenTitleType.textContent = title.type;
    fullscreenTitleCat.textContent = title.category;
    fullscreenTitleCount.textContent = title.count;
  }
  fullscreenTitle.classList.toggle("is-visible", fullscreenRowIndex !== null);
  document.body.classList.toggle("is-fullscreen", fullscreenRowIndex !== null);

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
      row.style.transform = isFullscreenRow ? "translateY(calc(-50% - var(--stack-shift, 0px)))" : `translateY(calc(-50% + ${offsets[index]}vh))`;
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

let lastActivePosition = -1;

// The large logo is a one-time opening. Once the intro has run its course
// (row 0 fully open, and the logo's automatic shrink no longer moving the
// page), its stretch of the scroll timeline is cut out: the page gets
// shorter by exactly that much and the scroll position moves up by the same
// amount in the same frame, so nothing on screen moves. From then on the top
// of the page is row 0 with the small logo, and the large one only comes
// back with a reload.
let introRemoved = false;
let introAutoplayRunning = false;

// Returns true if it removed the intro (update() then starts over, since
// the scroll position it read no longer applies).
function maybeRemoveIntro(activePosition) {
  if (introRemoved || introAutoplayRunning || activePosition < 0) return false;
  // The panels remember the scroll position they opened on and restore it
  // on close, so the timeline mustn't change under them.
  if (document.body.classList.contains("panels-open")) return false;

  const totalWeight = INTRO_WEIGHT + ROW_COUNT * PAUSE_WEIGHT + (ROW_COUNT - 1) * RAMP_WEIGHT;
  const restShare = (totalWeight - INTRO_WEIGHT) / totalWeight;
  const scrollY = window.scrollY;
  const scrollablePx = stackWrapper.offsetHeight - window.innerHeight;
  const scrollableVh = (scrollablePx / window.innerHeight) * 100;
  const introScrollPx = scrollablePx * (INTRO_WEIGHT / totalWeight);

  introRemoved = true;
  stackWrapper.style.height = `calc(100vh + ${scrollableVh * restShare}vh)`;
  window.scrollTo(0, Math.max(0, scrollY - introScrollPx));
  return true;
}

// The scrollY at which row `position` sits in the middle of its own pause —
// the inverse of getActivePosition for a whole-number position, walking the
// same segment weights.
function getScrollYForPosition(position) {
  const introWeight = introRemoved ? 0 : INTRO_WEIGHT;
  const totalWeight = introWeight + ROW_COUNT * PAUSE_WEIGHT + (ROW_COUNT - 1) * RAMP_WEIGHT;
  const weight = introWeight + position * (PAUSE_WEIGHT + RAMP_WEIGHT) + PAUSE_WEIGHT / 2;
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;
  return (weight / totalWeight) * Math.max(scrollableHeight, 0);
}

// What the Info/Index panels (panels.js) need from the stack, and nothing
// more: parking it on a three-row frame behind them, knowing which row is
// the bottom one, and swapping that row's photos for a project's own.
window.gallery = {
  // Nearest whole row that has a neighbour both above and below it — the
  // three-row frame (small / large / small) the panels are designed over.
  getThreeRowScrollY() {
    const position = clamp(Math.round(lastActivePosition), 1, ROW_COUNT - 2);
    return getScrollYForPosition(position);
  },
  // Where the intro ends (row 0 open, logo small). Closing a panel returns
  // no further up than this: opening a panel ends the intro.
  getIntroEndScrollY() {
    return getScrollYForPosition(0);
  },
  getBottomRowIndex() {
    return clamp(Math.round(lastActivePosition) + 1, 0, ROW_COUNT - 1);
  },
  openProjectFullscreen,
  releaseImages: releaseGalleryImages,
  setRowFiles(rowIndex, files) {
    rowFileOverrides[rowIndex] = files && files.length ? files : null;
    rowControllers[rowIndex].remount();
  },
  update,
};

// Leaving fullscreen without clicking the photo: the Back button, or Escape.
function closeFullscreen() {
  if (fullscreenRowIndex !== null) setFullscreenRow(fullscreenRowIndex);
}

document.getElementById("fullscreenBack").addEventListener("click", closeFullscreen);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeFullscreen();
});

// One rAF-throttled update(), shared by everything that can ask for a restack
// faster than the screen can draw one: scrolling, a swipe dragging under the
// finger, and a photo's real shape arriving from the network.
let ticking = false;
function scheduleUpdate() {
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
  refreshMetrics();
  measureNavLogo();
  update();
  // update() leaves the fullscreen column alone — nothing about it changes
  // while fullscreen is open and the page is merely scrolling. A resize is the
  // exception, since every size it laid out came from the viewport.
  if (fullscreenRowIndex !== null) rowControllers[fullscreenRowIndex].refreshColumnLayout();
}

window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", remeasureAndUpdate);
window.addEventListener("load", remeasureAndUpdate);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(remeasureAndUpdate);
}

remeasureAndUpdate();

// Returning via back / forward: skip the intro, landing on row 0 with the
// small logo (maybeRemoveIntro then cuts the intro out as usual).
if (IS_HISTORY_NAVIGATION) {
  window.scrollTo(0, getScrollYForPosition(0));
  update();
}

// Plays the logo's shrink into the nav by itself, once the opening photo
// grid (intro-grid.js) has finished and calls gallery.playIntro. It scrolls
// the page to row 0's pause, the same place scrolling by hand gets to, so
// the logo, the first row and the titles still move in lockstep, and
// scrolling back to the top still brings the large logo back. Runs once per
// page load. Any scroll input from the visitor, or opening a panel, cancels
// it mid-way.
const INTRO_AUTOPLAY_DURATION_MS = 500;

window.gallery.playIntro = (function setUpIntroAutoplay() {
  let started = false;
  let cancelled = false;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function cancel() {
    cancelled = true;
  }

  function play() {
    if (started || cancelled) return;
    started = true;

    const fromY = window.scrollY;
    const toY = getScrollYForPosition(0);
    // Already past the intro, e.g. the browser restored a scroll position.
    if (fromY >= toY) return;

    // Holds off maybeRemoveIntro while this is still scrolling the page
    // towards a target measured on the full timeline.
    introAutoplayRunning = true;
    const startTime = performance.now();
    function tick(now) {
      if (cancelled || document.body.classList.contains("panels-open")) {
        introAutoplayRunning = false;
        return;
      }
      const t = Math.min(1, (now - startTime) / INTRO_AUTOPLAY_DURATION_MS);
      window.scrollTo(0, lerp(fromY, toY, easeInOut(t)));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        introAutoplayRunning = false;
        update();
      }
    }
    requestAnimationFrame(tick);
  }

  // touchmove rather than touchstart: a plain tap (which skips the opening
  // grid and starts this, see intro-grid.js) isn't scrolling.
  ["wheel", "touchmove", "keydown"].forEach((type) => {
    window.addEventListener(type, cancel, { passive: true });
  });

  return play;
})();

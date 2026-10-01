// The homepage gallery. Plain DOM code, as it was on the static site: it runs
// once, when the page loads it in the browser (components/Gallery.tsx), and
// startGallery at the end of this file hands it the rows to show.
import { sanityImageUrl } from "../sanity-image";

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
export const INTRO_GRID_WILL_RUN =
  !IS_HISTORY_NAVIGATION && !/(^#|[+,])(info|index)\b/i.test(window.location.hash);

// Vertical: one row expands to MAX_VH, the rest collapse to MIN_VH, and the
// expanded row moves down the column as the page scrolls (a "distance from
// activePosition" stack, same shape as the card-stack algorithm in
// HomePageClient.tsx — mod/wrapped distance, cumulative-offset stacking —
// just applied to whole rows instead of individual cards).
//
// Horizontal (outside fullscreen): within a row, images are pulled
// dynamically from the row's own photos (rowPhotos) as needed (not a
// fixed 5) — only images within VISIBLE_RANGE of activeIndex are actually
// mounted, the centered one is large and every other visible one is a fixed
// small size, and they're spread edge to edge across the row via space-between. Navigation
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

// Each row's photos come from Sanity: one category's best-of, or one
// project's photos, depending on the view (see startGallery at the end of
// this file).

// How many rows the current view has. Set by buildRows.
let ROW_COUNT = 0;
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
// inset clears the Info/Index buttons by STACK_INSET_TOP_GAP_PX; their bottom
// edge moves with the type size (--px in theme.css), so refreshMetrics
// measures it into stackInsetTopPx. The three-row frame (small / large /
// small) is sized to fill exactly what's left, see refreshMetrics.
const STACK_INSET_TOP_GAP_PX = 10;
let stackInsetTopPx = 44;
// Desktop only: the logo's drawn height (the top of the "www" to the foot of
// the "y") as a share of the small rows' photo height: the same height. The
// wordmark fills 90.2 of its viewBox's 100.2 units in height, and the viewBox
// is 340.5 wide (see components/Logo.tsx); refreshMetrics works the logo's
// width out from these.
const LOGO_TO_PHOTO_HEIGHT = 1;
const LOGO_INK_HEIGHT_RATIO = 90.2 / 100.2;
const LOGO_ASPECT_RATIO = 340.5 / 100.2;
// Space kept below the logo, above the gallery: the same 9px the Info /
// Index buttons sit from the top of the screen.
const LOGO_PADDING_BOTTOM_PX = 9;
// Desktop's gap between rows, in px (ROW_GAP_REM at the root font size).
// Set in refreshMetrics.
let desktopRowGapPx = 64;
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
// total visible per row (2 small + large + 2 small); the rest of the
// row's photos stay unloaded until scrolled into range.
const DESKTOP_VISIBLE_RANGE = 2;
// Mobile shows one image per row at a time. The single image either side is
// mounted anyway, parked a full row-width out and clipped by .row's overflow,
// so it's already loaded and in place to slide in under a swipe.
const MOBILE_VISIBLE_RANGE = 1;
let VISIBLE_RANGE = DESKTOP_VISIBLE_RANGE;
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
  const bottomVh = isMobile ? INTRO_ROW_BOTTOM_VH : (STACK_INSET_BOTTOM_PX / viewportHeightPx) * 100;
  const shiftVh = (stackShiftPx / viewportHeightPx) * 100;
  return 50 - bottomVh - MIN_VH / 2 - shiftVh;
}
// Where in the intro the row titles start fading in. The nav itself is at
// rest and fully visible from the opening frame — only the per-row category
// labels hold back, since at the start there's just the one collapsed row
// and its label would sit alone at the bottom of an otherwise empty screen.
const INTRO_TITLE_FADE_START = 0.55;
// How far above the middle of the screen the full-width logo starts, as a
// share of the screen's height.
const INTRO_LOGO_RAISE = 0.03;

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

// Settling: a scroll that stops part-way through a handover, two rows (or,
// in fullscreen, two photos) each half open, is finished for the visitor —
// see settle and settleColumn. SETTLE_IDLE_MS is how long the input has to
// have been still before that starts, where there's no scrollend to say so.
// The glide takes SETTLE_MIN_MS plus SETTLE_MS_PER_RAMP for however much of
// the handover (0..1) is left. All three tunable purely by feel.
const SETTLE_IDLE_MS = 150;
const SETTLE_MIN_MS = 200;
const SETTLE_MS_PER_RAMP = 400;

function getSettleDurationMs(remaining) {
  return SETTLE_MIN_MS + SETTLE_MS_PER_RAMP * remaining;
}

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
export const MOBILE_QUERY = window.matchMedia("(max-width: 768px)");
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

// Which layout is currently live; set by refreshMetrics, read all over.
let isMobile = false;

const stackWrapper = document.getElementById("stackWrapper");
const stickyViewport = document.getElementById("stickyViewport");
const topNav = document.getElementById("topNav");
const navCenter = topNav.querySelector(".nav-center");
const navLogo = document.getElementById("navLogo");
const bottomFooter = document.getElementById("bottomFooter");
const fullscreenTitle = document.getElementById("fullscreenTitle");
const fullscreenTitleName = document.getElementById("fullscreenTitleName");
const fullscreenTitleCount = document.getElementById("fullscreenTitleCount");
// The Info/Index buttons (panels.js), hidden during fullscreen along with
// the rest of the nav.
const panelNav = document.getElementById("panelNav");
const viewSwitch = document.getElementById("viewSwitch");
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

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// The gallery's height, in px: what --vh (theme.css) is 1% of, and so what
// every vh size in this file is a share of. The screen's full height, or on
// a phone what's left of it below the Info / Index buttons, where the
// gallery starts (galleryTopPx, see .sticky-viewport in style.css). Read
// back off a probe that tall, in refreshMetrics.
let viewportHeightPx = window.innerHeight;
let galleryTopPx = 0;
let viewportProbe = null;

function measureViewportHeight() {
  if (!viewportProbe) {
    viewportProbe = document.createElement("div");
    viewportProbe.style.cssText =
      "position: fixed; top: 0; left: 0; width: 0; height: calc(100 * var(--vh)); visibility: hidden; pointer-events: none;";
    document.body.appendChild(viewportProbe);
  }
  viewportHeightPx = viewportProbe.getBoundingClientRect().height;
  galleryTopPx = parseFloat(getComputedStyle(stickyViewport).top) || 0;
}

// A length of `value` --vh, for the inline styles below.
function vh(value) {
  return `calc(${value} * var(--vh))`;
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
  measureViewportHeight();

  // Follows the Info / Index buttons, whose size follows the type.
  if (panelNav) {
    const indexToggle = panelNav.querySelector('.panel-toggle[data-panel="index"]');
    if (indexToggle) stackInsetTopPx = panelNav.offsetTop + indexToggle.offsetTop + indexToggle.offsetHeight + STACK_INSET_TOP_GAP_PX;
  }

  if (isMobile) {
    // Measured before anything else, because every size below is bounded by
    // it — see getMobileLargeMaxHeightVh and getMobileSmallHeightVh.
    const titleHeightPx = rowTitles[0] ? rowTitles[0].offsetHeight : 0;
    mobileMinRowGapVh = ((titleHeightPx + ROW_TITLE_GAP_PX * 2) / viewportHeightPx) * 100;

    // Every open row is a portrait photo's height, whatever it's showing
    // (see getMobileRowHeightVh), and the small tier takes what's left.
    MAX_VH = getMobileRowHeightVh();
    MIN_VH = getMobileSmallHeightVh(MAX_VH);
    VISIBLE_RANGE = MOBILE_VISIBLE_RANGE;
    IMG_MAX_WIDTH_VH = MAX_VH * IMG_ASPECT_RATIO;
    IMG_MIN_WIDTH_VH = MIN_VH * IMG_ASPECT_RATIO;
  } else {
    // The row sizes themselves follow the logo's slide, see
    // refreshStackFrame.
    VISIBLE_RANGE = DESKTOP_VISIBLE_RANGE;
    const rootFontSizePx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    desktopRowGapPx = ROW_GAP_REM * rootFontSizePx;

    // The logo (read by .nav-logo in panels.css, set before measureNavLogo
    // reads its size): its drawn height is LOGO_TO_PHOTO_HEIGHT of the small
    // rows' photos as they are while it's in view, when the gallery's frame
    // starts below it (see refreshStackFrame). So the logo's size and the
    // photos' depend on each other, and are solved for together: a small
    // photo is photoShare of the frame's height less its two gaps, and the
    // frame loses the logo's own height at its top.
    const logoTopPx = parseFloat(getComputedStyle(topNav).paddingTop) || 0;
    const logoPerPhotoPx = LOGO_TO_PHOTO_HEIGHT / LOGO_INK_HEIGHT_RATIO;
    const photoShare = DESKTOP_MIN_VH / (DESKTOP_MAX_VH + DESKTOP_MIN_VH * 2);
    const roomPx = viewportHeightPx - STACK_INSET_BOTTOM_PX - desktopRowGapPx * 2 - logoTopPx - LOGO_PADDING_BOTTOM_PX;
    const photoPx = (photoShare * roomPx) / (1 + photoShare * logoPerPhotoPx);
    topNav.style.setProperty("--logo-width", `${photoPx * logoPerPhotoPx * LOGO_ASPECT_RATIO}px`);
  }

  // Read by .row / .row-title in style.css.
  stickyViewport.style.setProperty("--stack-side", `${isMobile ? 0 : STACK_INSET_SIDE_PX}px`);
}

// Fits the gallery into the part of the screen the nav leaves it: all of it
// with the logo slid away, everything below the logo (and its
// LOGO_PADDING_BOTTOM_PX) with the logo in place, and in between while it
// slides (logoReveal, see slideLogo). Desktop scales the design's 75vh / 6vh
// rows so the three-row frame (one large row, a small one either side, two
// gaps) spans exactly the space between the top and bottom insets; the top
// one is the Info / Index buttons' or the nav's, whichever is lower. The
// phone layout is sized from the whole screen's height, so there the stack
// only moves down to the middle of what's left. Run at the start of every
// update(), so it follows the slide frame by frame.
function refreshStackFrame() {
  const navBottomPx = logoReveal * navRestBottomPx;
  topNav.style.transform = `translateY(${navBottomPx - navRestBottomPx}px)`;
  // The phone's Kategorien / Projekte switch trades places with the logo
  // (see .view-switch in panels.css).
  document.documentElement.style.setProperty("--logo-reveal", String(logoReveal));

  if (isMobile) {
    // The logo reaches a little past the buttons the gallery starts under.
    stackShiftPx = Math.max(0, navBottomPx - galleryTopPx) / 2;
  } else {
    const frameTopPx = Math.max(stackInsetTopPx, navBottomPx);
    const availablePx = viewportHeightPx - frameTopPx - STACK_INSET_BOTTOM_PX;
    const frameVh = DESKTOP_MAX_VH + DESKTOP_MIN_VH * 2;
    const scale = Math.max((availablePx - desktopRowGapPx * 2) / ((frameVh / 100) * viewportHeightPx), 0.1);

    MAX_VH = DESKTOP_MAX_VH * scale;
    MIN_VH = DESKTOP_MIN_VH * scale;
    IMG_MAX_WIDTH_VH = MAX_VH * IMG_ASPECT_RATIO;
    IMG_MIN_WIDTH_VH = MIN_VH * IMG_ASPECT_RATIO;
    stackShiftPx = (frameTopPx - STACK_INSET_BOTTOM_PX) / 2;
  }

  // Read by .row / .row-title in style.css.
  stickyViewport.style.setProperty("--stack-shift", `${stackShiftPx}px`);
  // Where the bottom row starts, read by the Index panel (panels.css) so it
  // can end just above it. On the root element, since the panel sits
  // outside .sticky-viewport.
  document.documentElement.style.setProperty(
    "--stack-bottom-row-top",
    `calc(${STACK_INSET_BOTTOM_PX}px + ${vh(MIN_VH)})`,
  );
}

// Each row treats its photos (rowPhotos) as an infinite, wrapping strip —
// poolIndex is a plain unbounded integer (it just keeps counting up/down as
// you click further in either direction) and only the photo lookup wraps,
// via mod. poolIndex 0 is the row's first photo, the one centered when the
// row opens, as sorted in the Studio.
//
// A row can also be handed its own short list of photos for a while (see
// setRowPhotos below — the Index panel does this to preview one project in
// the bottom row). That list wraps the same way, offset by VISIBLE_RANGE so
// its first photo is the leftmost one mounted rather than the centered one.
//
// A photo is { url, aspect }: its Sanity CDN URL and its width / height.
// Both lists are set with the rows by buildRows.
let rowPhotos = [];
let rowPhotoOverrides = [];

function getRowPhotoList(rowIndex) {
  return rowPhotoOverrides[rowIndex] || rowPhotos[rowIndex];
}

// Where poolIndex falls in the row's list (0-based).
function getRowPhotoIndex(rowIndex, poolIndex) {
  const offset = rowPhotoOverrides[rowIndex] ? VISIBLE_RANGE : 0;
  return mod(poolIndex + offset, getRowPhotoList(rowIndex).length);
}

function getRowPhoto(rowIndex, poolIndex) {
  return getRowPhotoList(rowIndex)[getRowPhotoIndex(rowIndex, poolIndex)];
}

// A counter, "07/75": photo number (1-based) of how many.
function formatCount(number, total) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(number)}/${pad(total)}`;
}

// The row title's counter: which photo poolIndex is, of how many.
function getRowPhotoCount(rowIndex, poolIndex) {
  return formatCount(getRowPhotoIndex(rowIndex, poolIndex) + 1, getRowPhotoList(rowIndex).length);
}

// The row title's dots on a phone, as on Instagram: one per photo up to
// ROW_DOTS, the current one black (see .row-title-dots in style.css). With
// more photos than dots, the black one moves along to the middle dot and
// stays there while the photos pass under it, moving on to the last dots
// only for the last photos.
const ROW_DOTS = 5;

function getRowDotIndex(rowIndex, poolIndex) {
  const photoIndex = getRowPhotoIndex(rowIndex, poolIndex);
  const total = getRowPhotoList(rowIndex).length;
  if (total <= ROW_DOTS) return photoIndex;
  const firstPhotoIndex = clamp(photoIndex - Math.floor(ROW_DOTS / 2), 0, total - ROW_DOTS);
  return photoIndex - firstPhotoIndex;
}

// Every photo's real shape (width/height). Sanity sends it along with the
// photo (photo.aspect), so the layout has it before the photo has loaded;
// the browser's own measurement, taken as each one loads and kept by URL,
// has the last word. The pool is two orientations — a 3:2 landscape frame and a 2:3 portrait one —
// and on mobile they are laid out as what they are: both span the screen's
// full width, which makes the portrait ones more than twice as tall.
//
// IMG_ASPECT_RATIO stands in where neither is known. On desktop that
// stand-in is the only ratio ever used: the layout there is a grid of
// identically shaped boxes with object-fit: contain fitting each photo inside
// its own, which is exactly what makes a portrait photo come out small there.
const imageAspects = new Map();

function getImageAspect(photo) {
  return imageAspects.get(photo.url) ?? photo.aspect ?? IMG_ASPECT_RATIO;
}

// Records a photo's shape the moment the browser knows it, and restacks if
// that shape is news — on mobile a row is exactly as tall as the image it's
// showing, so the first load of a portrait frame really does change the
// layout around it.
function recordImageAspect(photo, img) {
  if (!img.naturalWidth || !img.naturalHeight) return;
  const aspect = img.naturalWidth / img.naturalHeight;
  if (imageAspects.get(photo.url) === aspect) return;
  imageAspects.set(photo.url, aspect);
  scheduleUpdate();
}

// Mounts one image and wires it up to report its shape back. Shared by the
// in-row stack and the fullscreen column, which mount from the same pool.
// While the opening grid plays, the gallery behind it is hidden, but its
// large photos (a few hundred KB each) would still download and crowd out the
// grid's tiny ones. So until gallery.releaseImages() (called when the grid
// ends) photos are only noted, not fetched. A fallback releases them anyway
// in case the grid never gets that far.
let galleryImagesHeld = INTRO_GRID_WILL_RUN;
const heldImages = new Map(); // img -> the src it gets on release

function setImageSrc(img, src) {
  if (galleryImagesHeld) heldImages.set(img, src);
  else img.src = src;
}

function releaseGalleryImages() {
  if (!galleryImagesHeld) return;
  galleryImagesHeld = false;
  heldImages.forEach((src, img) => {
    img.src = src;
  });
  heldImages.clear();
}

if (galleryImagesHeld) window.setTimeout(releaseGalleryImages, 15000);

// Sanity's image CDN scales each photo on request, in two sizes here. The
// large one is the largest a photo is ever drawn on this screen
// (fullscreen, or full width on a phone), rounded up to a 400px step so
// visitors with similar screens share the CDN's cached copies, and capped
// at 2400px. On a phone, at 1600px: the most a photo is drawn there is a
// full-width portrait one, about that tall at 3x density, and every pixel
// more is one more for the phone to load and decode mid-scroll.
const PHOTO_LONG_EDGE_PX = Math.min(
  MOBILE_QUERY.matches ? 1600 : 2400,
  Math.ceil((Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1)) / 400) * 400,
);
// The small one is enough for the small tier on any screen, and is what a
// photo starts out as: most photos on screen are small ones, in collapsed
// rows or beside the large photo, and only a few are ever looked at large.
// It swaps to the large size once it's drawn bigger than this (see
// showLargePhotoIfNeeded).
const SMALL_PHOTO_PX = 480;

function getPhotoUrl(photo, large) {
  const px = large ? PHOTO_LONG_EDGE_PX : SMALL_PHOTO_PX;
  return sanityImageUrl(photo.url, { w: px, h: px, fit: "max", q: 80 });
}

// Which photo each mounted image shows, and which ones have been given their
// large copy already.
const imagePhotos = new WeakMap();
const largeImages = new WeakSet();

// large: start with the large copy straight away (the fullscreen column,
// where every photo is shown big).
function createPoolImage(rowIndex, poolIndex, large = false) {
  const photo = getRowPhoto(rowIndex, poolIndex);
  const img = document.createElement("img");
  imagePhotos.set(img, photo);
  if (large) largeImages.add(img);
  setImageSrc(img, getPhotoUrl(photo, large));
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("load", () => recordImageAspect(photo, img));
  // A cached image can already be decoded by the time the listener above is
  // attached, in which case its load event has been and gone.
  if (img.complete) recordImageAspect(photo, img);
  return img;
}

// Swaps a photo to its large copy, once, when it's drawn bigger than the
// small copy can cover (widthVh / heightVh: its box right now) or when
// `upcoming` says it's about to be: the photos beside the large one in the
// row that's open, which a click, swipe or auto-advance step brings to the
// middle next. The small copy shows until the large one is ready, so the
// swap reads as the photo sharpening, never as a gap.
function showLargePhotoIfNeeded(img, widthVh, heightVh, upcoming) {
  if (largeImages.has(img)) return;
  const longEdgePx = (Math.max(widthVh, heightVh) / 100) * viewportHeightPx * (window.devicePixelRatio || 1);
  if (!upcoming && longEdgePx <= SMALL_PHOTO_PX) return;
  largeImages.add(img);
  const src = getPhotoUrl(imagePhotos.get(img), true);
  if (galleryImagesHeld) {
    setImageSrc(img, src);
    return;
  }
  // Loaded and decoded off to the side first, and only then put in the
  // photo, so the decoding (a few megapixels) doesn't land in the middle of
  // a scroll frame.
  const loader = new Image();
  loader.src = src;
  loader
    .decode()
    .catch(() => {})
    .then(() => {
      if (img.isConnected) img.src = src;
    });
}

// The width a full-width image actually gets, in vh — the viewport less the
// padding down each side. Mobile sizes the large tier by width while every
// other measurement in this file is in vh, and this is where the two meet.
function getMobileFullWidthVh() {
  const widthPx = document.documentElement.clientWidth - MOBILE_SIDE_PADDING_PX * 2;
  return (Math.max(widthPx, 1) / viewportHeightPx) * 100;
}

// The large tier on mobile: the image spans the screen's full width whatever
// its shape, so its height is simply whatever that width implies — around
// 30vh for a landscape frame, better than twice that for a portrait one. See
// getMobileLargeMaxHeightVh for the one case that can't be honoured.
function getMobileLargeHeightVh(aspect) {
  return Math.min(getMobileFullWidthVh() / aspect, getMobileLargeMaxHeightVh());
}

// A portrait photo's shape (2:3), which the open row's height is taken from.
const MOBILE_PORTRAIT_ASPECT = 2 / 3;

// The open row's height on mobile: a full-width portrait photo's, whichever
// photo is showing, so the row (and the stack around it) keeps one height
// as its photos change.
function getMobileRowHeightVh() {
  return getMobileLargeHeightVh(MOBILE_PORTRAIT_ASPECT);
}

// A photo's height in the open row: full width at its own shape, centered
// in the row's height (a landscape one with room above and below), and
// fitted to that height if it's taller than a portrait photo.
function getMobileRowPhotoHeightVh(aspect) {
  return Math.min(getMobileLargeHeightVh(aspect), getMobileRowHeightVh());
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
function setUpRow(row, rowIndex, countEl, dotsEl) {
  const dotEls = [...dotsEl.children];
  let dotsState = "";
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
  swipeHint.innerHTML = '<img src="/arrow.svg" alt="">';
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
  // portrait frame is as wide as a landscape one and simply taller, and both
  // sit centered in the row's portrait-photo height; collapsing
  // toward MIN_VH as the row loses focus keeps that true at the small end too,
  // where every image shares one height and widths follow their own shapes
  // from there. Images sit a full row-width apart, which puts the neighbours
  // just off screen — MOBILE_SIDE_PADDING_PX clear of the one on screen, since
  // each is that much narrower than the row.
  function styleMobileImage(img, poolIndex, rowWidthPx) {
    const aspect = getImageAspect(getRowPhoto(rowIndex, poolIndex));
    const heightVh = lerp(getMobileRowPhotoHeightVh(aspect), MIN_VH, rowDistance);
    img.style.height = vh(heightVh);
    img.style.width = vh(heightVh * aspect);
    showLargePhotoIfNeeded(img, heightVh * aspect, heightVh, isUpcoming(poolIndex));
    const offsetPx = (poolIndex - activeIndex) * rowWidthPx + dragOffsetPx;
    img.style.transform = `translate(calc(-50% + ${offsetPx}px), -50%)`;
  }

  // Rides the current image's right edge, SWIPE_HINT_INSET_PX inside it
  // (dragged along with it mid-swipe), and fades out as the row collapses,
  // so only the large row carries one.
  function placeSwipeHint() {
    const aspect = getImageAspect(getRowPhoto(rowIndex, activeIndex));
    const widthPx = lerp(getMobileRowPhotoHeightVh(aspect), MIN_VH, rowDistance) * aspect * (viewportHeightPx / 100);
    const rightEdgePx = widthPx / 2 + dragOffsetPx;
    swipeHint.style.transform = `translate(calc(${rightEdgePx - SWIPE_HINT_INSET_PX}px - 100%), -50%)`;
    swipeHint.style.opacity = `${clamp(1 - rowDistance * 2, 0, 1)}`;
    swipeHint.style.visibility = rowDistance >= 0.5 ? "hidden" : "";
  }

  // The large photo and the ones either side of it, while this row is the
  // open one (more than halfway grown): see showLargePhotoIfNeeded.
  function isUpcoming(poolIndex) {
    return rowDistance < 0.5 && Math.abs(poolIndex - activeIndex) <= 1;
  }

  function applyLayout() {
    // The title counts along as the photos step, however they do: a click, a
    // swipe, auto-advance, or the row resetting to its first photo.
    const count = getRowPhotoCount(rowIndex, activeIndex);
    if (countEl.textContent !== count) countEl.textContent = count;
    const dotCount = Math.min(getRowPhotoList(rowIndex).length, ROW_DOTS);
    const activeDot = getRowDotIndex(rowIndex, activeIndex);
    if (dotsState !== `${activeDot}/${dotCount}`) {
      dotsState = `${activeDot}/${dotCount}`;
      dotEls.forEach((dotEl, index) => {
        dotEl.hidden = index >= dotCount;
        dotEl.classList.toggle("is-active", index === activeDot);
      });
    }

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
    const vhToPx = viewportHeightPx / 100;
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
      img.style.width = vh(size.width);
      img.style.height = vh(size.height);
      showLargePhotoIfNeeded(img, size.width, size.height, isUpcoming(poolIndex));
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
  // closes it). Over a step zone, that half of the row also tints (desktop
  // only, see .row.is-hover-left / -right in style.css).
  row.addEventListener("mousemove", (event) => {
    if (isFullscreen) {
      row.style.cursor = "zoom-out";
      setHoverHalf(null);
      return;
    }

    const zone = getZone(event);
    row.style.cursor = zone === "center" ? "zoom-in" : zone === "left" ? "w-resize" : "e-resize";
    setHoverHalf(zone === "center" || isMobile ? null : zone);
  });

  row.addEventListener("mouseleave", () => setHoverHalf(null));

  // half: "left", "right", or null for neither.
  function setHoverHalf(half) {
    row.classList.toggle("is-hover-left", half === "left");
    row.classList.toggle("is-hover-right", half === "right");
  }

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
    if (Math.abs(dragOffsetPx) >= threshold) {
      dismissSwipeHint();
    }

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
  // a row's photos are far more than what's ever near the centered image at
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
  // treatment the row's photos already get elsewhere via mod().
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
    if (isFullscreen) updateFullscreenCount(columnPosition);
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
      const img = createPoolImage(rowIndex, i, true);
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
            const aspect = getImageAspect(getRowPhoto(rowIndex, poolIndex));
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
      img.style.width = vh(size.width);
      img.style.height = vh(size.height);
      const offset = centers.get(poolIndex) - focusCenter;
      img.style.transform = `translate(-50%, calc(-50% + ${vh(offset)}))`;
    });
  }

  // The column's own settling, the same as the page's (see settle): once the
  // wheel has been still for SETTLE_IDLE_MS, or the finger lifts, a column
  // caught between two photos glides on to the next one the way it was
  // going, or back to the one it was leaving. The glide eases to a stop
  // where that photo is fully open, then steps on to the middle of its
  // pause, where centerColumnOnActiveImage opens the column too. A new wheel
  // or touch takes over from wherever the glide has got to.
  let columnDirection = 1; // 1 on to the next photo, -1 back
  let columnSettleFrame = null;
  let columnSettleTimeoutId = null;

  function stopColumnSettle() {
    cancelAnimationFrame(columnSettleFrame);
    columnSettleFrame = null;
    window.clearTimeout(columnSettleTimeoutId);
  }

  function settleColumn() {
    stopColumnSettle();
    const index = Math.floor(columnScrollUnits / COLUMN_STEP_WEIGHT);
    const local = columnScrollUnits - index * COLUMN_STEP_WEIGHT;
    // Inside a photo's pause, so it's fully open already.
    if (local <= PAUSE_WEIGHT) return;

    const forward = columnDirection > 0;
    const t = (local - PAUSE_WEIGHT) / RAMP_WEIGHT;
    const targetUnits = (forward ? index + 1 : index) * COLUMN_STEP_WEIGHT;
    const fromUnits = columnScrollUnits;
    const edgeUnits = forward ? targetUnits : targetUnits + PAUSE_WEIGHT;
    const durationMs = getSettleDurationMs(forward ? 1 - t : t);
    const startTime = performance.now();
    function tick(now) {
      const k = Math.min(1, (now - startTime) / durationMs);
      columnScrollUnits = k < 1 ? lerp(fromUnits, edgeUnits, easeInOut(k)) : targetUnits + PAUSE_WEIGHT / 2;
      applyColumnLayout();
      columnSettleFrame = k < 1 ? requestAnimationFrame(tick) : null;
    }
    columnSettleFrame = requestAnimationFrame(tick);
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
      stopColumnSettle();
      if (event.deltaY !== 0) columnDirection = Math.sign(event.deltaY);
      columnScrollUnits += (event.deltaY / FULLSCREEN_COLUMN_PX_PER_STEP) * COLUMN_STEP_WEIGHT;
      applyColumnLayout();
      columnSettleTimeoutId = window.setTimeout(settleColumn, SETTLE_IDLE_MS);
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
      stopColumnSettle();
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

      if (dy !== 0) columnDirection = dy < 0 ? 1 : -1;
      columnScrollUnits -= (dy / FULLSCREEN_COLUMN_TOUCH_PX_PER_STEP) * COLUMN_STEP_WEIGHT;
      applyColumnLayout();
    },
    { passive: false },
  );

  // Settles once the last finger is off (one lifting out of a pinch leaves
  // the other still dragging).
  const settleColumnOnRelease = (event) => {
    if (event.touches.length === 0) settleColumn();
  };
  column.addEventListener("touchend", settleColumnOnRelease, { passive: true });
  column.addEventListener("touchcancel", settleColumnOnRelease, { passive: true });

  // The fullscreen title's counter, for the photo nearest the middle.
  function updateFullscreenCount(columnPosition) {
    const count = getRowPhotoCount(rowIndex, Math.round(columnPosition));
    if (fullscreenTitleCount.textContent !== count) fullscreenTitleCount.textContent = count;
  }

  // Aligns columnScrollUnits so scrollUnitsToPosition resolves to exactly
  // activeIndex (the middle of its pause, so the first wheel either way has
  // the same stretch to go before anything moves) — called synchronously
  // right after the fullscreen-opening update() (see setFullscreenRow) so
  // the column opens already centered on the same image that was active in
  // the stack, rather than wherever it was left scrolled to last time.
  function centerColumnOnActiveImage() {
    stopColumnSettle();
    columnScrollUnits = activeIndex * COLUMN_STEP_WEIGHT + PAUSE_WEIGHT / 2;
    applyColumnLayout();
  }

  return {
    centerColumnOnActiveImage,
    // Auto-advance's step (see autoAdvance): the same move as clicking the
    // right half, slid into place on mobile like a finished swipe.
    stepForward() {
      activeIndex += 1;
      if (isMobile) {
        settleSwipe();
        update();
      } else {
        applyLayout();
      }
    },
    // A finger is on the row (or it's still being dragged), so auto-advance
    // mustn't move it out from under the gesture.
    isBusy() {
      return touchAxis !== null || dragOffsetPx !== 0;
    },
    // Drops every mounted image so the next layout pass mounts fresh ones
    // from whatever getRowPhoto now returns — used when the row's photo
    // list is swapped out from under it (see setRowPhotos).
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
    refreshFullscreenCount() {
      updateFullscreenCount(scrollUnitsToPosition(columnScrollUnits));
    },
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

// Title-row content: a label ("Kategorie" for a category's row, "Projekt"
// for a project's, see lib/gallery/index.js), the row's name, its place (a
// project's Ort) and the "current/total" counter, which counts along as the
// row steps (see applyLayout). Set with the rows by buildRows.
let ROW_TITLES = [];

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

// Replaces whatever rows are showing with one per entry in rowsData ({ type,
// category, place, photos }): on start, and again whenever the Projekte /
// Kategorien switch changes the view (see setView).
function buildRows(rowsData) {
  rows.forEach((row) => row.remove());
  rowTitles.forEach((titleEl) => titleEl.remove());
  rows.length = 0;
  rowTitles.length = 0;
  rowControllers.length = 0;

  ROW_COUNT = rowsData.length;
  rowPhotos = rowsData.map((rowData) => rowData.photos);
  rowPhotoOverrides = new Array(ROW_COUNT).fill(null);
  ROW_TITLES = rowsData.map((rowData) => ({
    type: rowData.type,
    category: rowData.category,
    place: rowData.place,
  }));

  for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "row";

    // A sibling of .row, not a child — sitting inside .row would mean living
    // inside its overflow: hidden clip, pinned to its top edge and so
    // overlaying the image content underneath. As its own element it's free
    // to sit in the gap above the row instead (see updateRowTitles).
    //
    // Full width (see .row-title in style.css): the label on the left, the
    // name centered, place and count on the right; on a phone the name on
    // the left, the dots in the middle and the count. Only the large row shows
    // its title; updateRowTitles fades it out once the row has collapsed
    // past the halfway point.
    const rowTitle = document.createElement("div");
    rowTitle.className = "row-title";
    const title = ROW_TITLES[rowIndex];
    // The texts go in through textContent: project names and places are
    // typed in the Studio, not markup.
    rowTitle.innerHTML = `<span class="row-title-type"></span><span class="row-title-cat"></span><span class="row-title-dots" aria-hidden="true">${"<span>•</span>".repeat(ROW_DOTS)}</span><span class="row-title-pair"><span class="row-title-place"></span><span class="row-title-count"></span></span>`;
    rowTitle.querySelector(".row-title-type").textContent = title.type;
    rowTitle.querySelector(".row-title-cat").textContent = title.category;
    rowTitle.querySelector(".row-title-place").textContent = title.place;
    stickyViewport.appendChild(rowTitle);
    rowTitles.push(rowTitle);

    rowControllers.push(
      setUpRow(row, rowIndex, rowTitle.querySelector(".row-title-count"), rowTitle.querySelector(".row-title-dots")),
    );
    stickyViewport.appendChild(row);
    rows.push(row);
  }

  setStackHeight();
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

// Every row grows to the same MAX_VH: on desktop every image is fitted into
// an identically shaped box, and on mobile the open row is a portrait
// photo's height whatever it shows (see getMobileRowHeightVh).
function getHeights(distances) {
  return distances.map((distance) => lerp(MAX_VH, MIN_VH, distance));
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
  return (gapPx / viewportHeightPx) * 100;
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
let navRestBottomPx = 0;

function measureNavLogo() {
  navCenter.style.transform = "none";

  // Relative to the nav (fixed at the top-left corner), which may be slid
  // up out of view at the moment (see updateTopNav).
  const navRect = topNav.getBoundingClientRect();
  const logoRect = navLogo.getBoundingClientRect();
  const paddingRightPx = parseFloat(getComputedStyle(navLogo).paddingRight) || 0;
  // .top-nav's own horizontal padding is the inset the full-width logo lines
  // up to, so it sits flush with everything else in the nav rather than
  // bleeding to the raw viewport edge.
  const navInsetPx = parseFloat(getComputedStyle(topNav).paddingLeft) || 0;

  // Where the nav ends, and the gallery starts, while the logo is in place:
  // LOGO_PADDING_BOTTOM_PX below it. The white behind the logo reaches down
  // to here (.top-nav--solo::before in panels.css).
  navRestBottomPx = logoRect.bottom - navRect.top + LOGO_PADDING_BOTTOM_PX;
  topNav.style.setProperty("--logo-backdrop-height", `${navRestBottomPx}px`);

  navLogoMetrics = {
    left: logoRect.left - navRect.left,
    top: logoRect.top - navRect.top,
    contentWidth: logoRect.width - paddingRightPx,
    // For centring the full-width logo vertically at the start of the intro.
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

  const fullWidthPx = window.innerWidth - navLogoMetrics.navInsetPx * 2;
  const fullScale = fullWidthPx / navLogoMetrics.contentWidth;
  const scale = lerp(fullScale, 1, introProgress);
  const shiftPx = lerp(navLogoMetrics.navInsetPx - navLogoMetrics.left, 0, introProgress);
  // At full width the logo starts a little above the middle of the screen
  // (INTRO_LOGO_RAISE; Figma 39:2 has it centered), then rises to its place
  // in the nav as it shrinks.
  const startTopPx = window.innerHeight * (0.5 - INTRO_LOGO_RAISE) - (navLogoMetrics.height * fullScale) / 2;
  const shiftYPx = lerp(startTopPx - navLogoMetrics.top, 0, introProgress);

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

// Once the intro has shrunk the logo into place, it slides up out of view
// (with the white behind it) as you scroll on down, and back in as soon as
// you scroll up, taking the gallery's space with it. Going down it leaves
// in step with the rows (see hideLogoWithHandover), so it holds still with
// them while a row is held at full size and moves only as one row hands
// over to the next. The intro's own movements (its autoplay, the jump to
// row 0 on coming back to the page) end on row 0, so they never move it.
// Coming back it slides in on its own (see slideLogo) as soon as the page
// moves up at all, read from scrollY rather than the timeline position,
// which stands still while a row is held. Hovering the top of the screen
// brings it in too (see followPointerForLogo).
function updateTopNav(scrollDeltaPx, previousPosition, position) {
  if (position < 0) {
    logoHiddenByScroll = false;
    slideLogo(1);
  } else if (position > previousPosition && previousPosition >= 0) {
    logoHiddenByScroll = true;
    // A pointer hovering the top keeps it in view (see followPointerForLogo).
    if (!logoHovered) hideLogoWithHandover(position);
  } else if (scrollDeltaPx < 0) {
    logoHiddenByScroll = false;
    slideLogo(1);
  }
}

// How far the logo is slid into view: 1 in place, 0 slid up out of view.
// The nav and the gallery's frame both follow it (refreshStackFrame), so
// the gallery gives the logo its room as it slides in and takes it back as
// it slides out, never passing under it. Tweened here rather than by a CSS
// transition, which the frame couldn't follow.
let logoReveal = 1;
let logoRevealTarget = 1;
let logoSlideFrame = null;
const LOGO_SLIDE_MS = 400;

function slideLogo(target) {
  if (target === logoRevealTarget) return;
  logoRevealTarget = target;
  const from = logoReveal;
  // A slide turned around halfway only has half the way to go back.
  const durationMs = LOGO_SLIDE_MS * Math.abs(target - from);
  const startTime = performance.now();
  cancelAnimationFrame(logoSlideFrame);
  function tick(now) {
    const t = durationMs > 0 ? Math.min(1, (now - startTime) / durationMs) : 1;
    logoReveal = lerp(from, target, easeInOut(t));
    update();
    if (t < 1) logoSlideFrame = requestAnimationFrame(tick);
  }
  logoSlideFrame = requestAnimationFrame(tick);
}

// The logo leaving in step with the rows: however far the page is through
// the handover from one row to the next, that much of the logo is gone —
// never bringing back any that's already gone. Landing on the next row is
// the whole way. Takes over from a slide back in that's still running.
function hideLogoWithHandover(position) {
  const handover = Number.isInteger(position) ? 1 : position - Math.floor(position);
  cancelAnimationFrame(logoSlideFrame);
  logoRevealTarget = 0;
  logoReveal = Math.min(logoReveal, 1 - handover);
}

// Hovering the top of the screen, the top LOGO_HOVER_ZONE_VH over where the
// logo sits, slides the logo in for as long as the pointer stays there, and
// leaving takes it away again if scrolling had put it away. A mouse (or
// trackpad) only: a finger has nothing to hover with. Not while fullscreen
// or a panel hides the logo anyway.
const LOGO_HOVER_ZONE_VH = 7;
let logoHovered = false;
// Whether scrolling has put the logo away (a handover down) rather than
// leaving it in view: what it goes back to once the hover ends.
let logoHiddenByScroll = false;

function followPointerForLogo(event) {
  if (event.pointerType !== "mouse") return;
  const hovered = event.clientY < (LOGO_HOVER_ZONE_VH / 100) * window.innerHeight;
  if (hovered === logoHovered) return;
  logoHovered = hovered;
  if (fullscreenRowIndex !== null || document.body.classList.contains("panels-open")) return;
  if (hovered) slideLogo(1);
  else if (logoHiddenByScroll) slideLogo(0);
}

// Same logic as updateTopNav above, reversed: driven by the *last* row's
// distance instead of row 0's, and a positive translateY (pushed down, off
// the bottom of the viewport) instead of negative — so the footer starts
// hidden below the fold and slides up into view in lockstep with the last
// row becoming active, finishing at rest exactly when that row is fully
// active, same as the top nav does with row 0. Desktop only: on a phone the
// footer follows the gallery in the page (see #bottomFooter in style.css).
function updateBottomFooter(rowLastDistance) {
  if (isMobile) {
    bottomFooter.style.transform = "";
    return;
  }
  const travelPx = bottomFooter.offsetHeight;
  bottomFooter.style.transform = `translateY(${rowLastDistance * travelPx}px)`;
}

// Rows further than this from the one open in the middle are off screen
// whatever the stack is doing (it shows the open row and one either side,
// two of them mid-handover), so update() hides them, with their titles, and
// leaves them be instead of laying them out again on every frame: with 19
// projects, most of what a scroll frame cost on a phone. A row coming back
// near is shown and laid out again in the same frame.
const NEAR_ROW_RANGE = 3;

function isRowNear(index, activePosition) {
  return Math.abs(index - activePosition) < NEAR_ROW_RANGE || index === fullscreenRowIndex;
}

function showRow(el, shown) {
  const display = shown ? "" : "none";
  if (el.style.display !== display) el.style.display = display;
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
function updateRowTitles(heights, offsets, distances, near) {
  rowTitles.forEach((titleEl, index) => {
    showRow(titleEl, near[index]);
    if (!near[index]) return;
    const rowTopVh = offsets[index] - heights[index] / 2;
    const rowBottomVh = rowTopVh + heights[index];
    titleEl.style.transform = `translateY(calc(${vh(rowBottomVh)} + ${ROW_TITLE_GAP_PX}px))`;
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

  rows.forEach((row) => {
    row.classList.add("fullscreen-transition");
    row.classList.remove("is-pressed");
  });
  update();
  if (opening) rowControllers[rowIndex].centerColumnOnActiveImage();
  window.setTimeout(() => {
    rows.forEach((row) => row.classList.remove("fullscreen-transition"));
  }, FULLSCREEN_TRANSITION_MS);
}

// Where the page's scroll position puts the timeline (see getActivePosition).
function getScrollActivePosition() {
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;

  const progress = scrollableHeight > 0
    ? clamp(window.scrollY / scrollableHeight, 0, 1)
    : 0;

  return getActivePosition(progress);
}

function update() {
  const activePosition = getScrollActivePosition();
  if (maybeRemoveIntro(activePosition)) {
    update();
    return;
  }
  const previousActivePosition = lastActivePosition;
  lastActivePosition = activePosition;
  const scrollDeltaPx = window.scrollY - lastScrollY;
  lastScrollY = window.scrollY;
  if (scrollDeltaPx !== 0) lastScrollDirection = Math.sign(scrollDeltaPx);
  // A different row has taken the middle: give it the full wait before its
  // first auto step.
  const middleRowIndex = Math.round(activePosition);
  if (middleRowIndex !== autoAdvanceRowIndex) {
    autoAdvanceRowIndex = middleRowIndex;
    restartAutoAdvance();
  }
  // Before refreshStackFrame, which fits the gallery around wherever this
  // leaves the logo, so the two move in the same frame.
  //
  // distances[0] is 1 at both ends of row 0's life — collapsed below the
  // logo during the intro, and collapsed again once row 1 takes over — but
  // the nav should only slide away for the second of those; during the intro
  // the logo *is* the nav, and it has to stay put. Clamping activePosition
  // to 0..1 gives exactly that: flat 0 (nav at rest) across the whole intro,
  // then row 0's own collapse distance from there on, continuous at the
  // handover point since both are 0 there.
  updateTopNav(scrollDeltaPx, previousActivePosition, activePosition);
  refreshStackFrame();
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
  const introShiftVh = (1 - introProgress) * getIntroRowShiftVh();
  const offsets = getOffsets(heights, activePosition, gapVh).map((offset) => offset + introShiftVh);

  updateIntroLogo(introProgress);
  updateIntroUi(introProgress);

  updateBottomFooter(distances[ROW_COUNT - 1]);
  const near = rows.map((_, index) => isRowNear(index, activePosition));
  updateRowTitles(heights, offsets, distances, near);
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
  // Just the name (the category's, or the project's) and the counter.
  if (fullscreenRowIndex !== null) {
    fullscreenTitleName.textContent = ROW_TITLES[fullscreenRowIndex].category;
    rowControllers[fullscreenRowIndex].refreshFullscreenCount();
  }
  fullscreenTitle.classList.toggle("is-visible", fullscreenRowIndex !== null);
  document.body.classList.toggle("is-fullscreen", fullscreenRowIndex !== null);

  rows.forEach((row, index) => {
    showRow(row, near[index]);
    if (!near[index]) return;
    // Fullscreen overrides the normal scroll-driven height/position for
    // just the one row — full viewport height, centered, on top (z-index,
    // since rows share a stacking context and later ones would otherwise
    // paint over an earlier one) — every other row is hidden entirely
    // (opacity + pointer-events, not display: none, so its own layout/state
    // stays intact for when fullscreen closes) rather than left showing
    // through, or clickable, behind it.
    if (fullscreenRowIndex !== null) {
      const isFullscreenRow = index === fullscreenRowIndex;
      row.style.height = vh(isFullscreenRow ? 100 : heights[index]);
      row.style.transform = isFullscreenRow ? "translateY(calc(-50% - var(--stack-shift, 0px)))" : `translateY(calc(-50% + ${vh(offsets[index])}))`;
      row.style.opacity = isFullscreenRow ? "1" : "0";
      row.style.pointerEvents = isFullscreenRow ? "" : "none";
      row.style.zIndex = isFullscreenRow ? "1" : "";
      row.classList.toggle("is-fullscreen", isFullscreenRow);

      rowControllers[index].setRowDistance(isFullscreenRow ? 0 : distances[index], isFullscreenRow);
      return;
    }

    row.style.height = vh(heights[index]);
    row.style.transform = `translateY(calc(-50% + ${vh(offsets[index])}))`;
    row.style.opacity = "";
    row.style.pointerEvents = "";
    row.style.zIndex = "";
    row.classList.remove("is-fullscreen");

    rowControllers[index].setRowDistance(distances[index], false);
  });
}

let lastActivePosition = -1;
// For telling which way the page is being scrolled (see updateTopNav).
let lastScrollY = 0;
// Which way it last moved, 1 down or -1 up, for settle to carry on in.
let lastScrollDirection = 1;

// Auto-advance: the large (middle) row steps to its next image on its own
// once the visitor has left the page alone for AUTO_ADVANCE_IDLE_MS, and
// then every AUTO_ADVANCE_MS for as long as they stay idle — the same step a
// click on its right half makes. Any input (mouse move, click, touch, wheel,
// key) restarts the idle wait, as does another row taking the middle. It
// holds while the page is between rows, during the intro, in fullscreen,
// with a panel open, and while the tab is in the background.
const AUTO_ADVANCE_IDLE_MS = 6000;
const AUTO_ADVANCE_MS = 4000;
let autoAdvanceTimeoutId = null;
let autoAdvanceRowIndex = null;
let lastActivityTime = performance.now();

// Only a timestamp: autoAdvance reads it when its timer fires, so a stream
// of mouse moves doesn't reset a timer on every event.
["pointerdown", "pointermove", "wheel", "keydown", "touchstart", "touchmove"].forEach((type) => {
  window.addEventListener(type, () => {
    lastActivityTime = performance.now();
  }, { capture: true, passive: true });
});

function restartAutoAdvance() {
  window.clearTimeout(autoAdvanceTimeoutId);
  autoAdvanceTimeoutId = window.setTimeout(autoAdvance, AUTO_ADVANCE_IDLE_MS);
}

function autoAdvance() {
  // Input since the timer was set: wait out the rest of the idle stretch.
  const idleMs = performance.now() - lastActivityTime;
  if (idleMs < AUTO_ADVANCE_IDLE_MS) {
    autoAdvanceTimeoutId = window.setTimeout(autoAdvance, AUTO_ADVANCE_IDLE_MS - idleMs);
    return;
  }
  autoAdvanceTimeoutId = window.setTimeout(autoAdvance, AUTO_ADVANCE_MS);
  if (document.hidden || fullscreenRowIndex !== null) return;
  const body = document.body.classList;
  if (body.contains("panels-open") || body.contains("is-intro") || body.contains("is-intro-grid")) return;
  // Only a row resting fully open, not one mid-handover to the next.
  const rowIndex = Math.round(lastActivePosition);
  if (rowIndex < 0 || rowIndex >= ROW_COUNT || Math.abs(lastActivePosition - rowIndex) > 0.001) return;
  const controller = rowControllers[rowIndex];
  if (controller.isBusy()) return;
  controller.stepForward();
}

// The large logo is a one-time opening. Once the intro has run its course
// (row 0 fully open, and the logo's automatic shrink no longer moving the
// page), its stretch of the scroll timeline is cut out: the page gets
// shorter by exactly that much and the scroll position moves up by the same
// amount in the same frame, so nothing on screen moves. From then on the top
// of the page is row 0 with the small logo, and the large one only comes
// back with a reload.
let introRemoved = false;
let introAutoplayRunning = false;

// How much scroll one unit of the timeline's weight takes: the pacing the
// original 980vh .stack-wrapper (style.css) gave the intro and five rows.
// The wrapper's height now follows the number of rows in the view, so every
// row keeps that same scroll distance however many there are.
const SCROLL_VH_PER_WEIGHT = 880 / (INTRO_WEIGHT + 5 * PAUSE_WEIGHT + 4 * RAMP_WEIGHT);

// The whole timeline getActivePosition walks, in weight units.
function getTimelineWeight() {
  const introWeight = introRemoved ? 0 : INTRO_WEIGHT;
  return introWeight + ROW_COUNT * PAUSE_WEIGHT + (ROW_COUNT - 1) * RAMP_WEIGHT;
}

function setStackHeight() {
  stackWrapper.style.height = vh(100 + getTimelineWeight() * SCROLL_VH_PER_WEIGHT);
  updateSnapPoints();
}

// Phone only, once the intro is over: the browser's own scroll snapping
// lands the page on a row (see html.snap-rows in style.css). Each row gets a
// marker at the scrollY where it rests open as its snap point; the footer is
// the last one. Not during the intro, which the page scrolls itself through
// and snapping would pull to a row partway. Set again whenever those places
// move: new rows, the intro going, a resize.
let snapMarkers = [];

function updateSnapPoints() {
  const snapping = isMobile && introRemoved;
  document.documentElement.classList.toggle("snap-rows", snapping);
  if (!snapping) {
    snapMarkers.forEach((marker) => marker.remove());
    snapMarkers = [];
    return;
  }
  while (snapMarkers.length < ROW_COUNT) {
    const marker = document.createElement("div");
    marker.className = "row-snap";
    stackWrapper.appendChild(marker);
    snapMarkers.push(marker);
  }
  snapMarkers.splice(ROW_COUNT).forEach((marker) => marker.remove());
  snapMarkers.forEach((marker, index) => {
    marker.style.top = `${getScrollYForPosition(index) - stackWrapper.offsetTop}px`;
  });
}

// Returns true if it removed the intro (update() then starts over, since
// the scroll position it read no longer applies).
function maybeRemoveIntro(activePosition) {
  // Not while the page is scrolling itself to a place measured on the full
  // timeline (the intro's autoplay, or settle).
  if (introRemoved || introAutoplayRunning || settleFrame !== null || activePosition < 0) return false;
  // The panels remember the scroll position they opened on and restore it
  // on close, so the timeline mustn't change under them.
  if (document.body.classList.contains("panels-open")) return false;

  const scrollY = window.scrollY;
  const scrollablePx = stackWrapper.offsetHeight - window.innerHeight;
  const introScrollPx = scrollablePx * (INTRO_WEIGHT / getTimelineWeight());

  introRemoved = true;
  setStackHeight();
  window.scrollTo(0, Math.max(0, scrollY - introScrollPx));
  // Not a scroll up, just the same place on a shorter page.
  lastScrollY = window.scrollY;
  return true;
}

// The scrollY at which row `position` sits `pauseAt` of the way through its
// own pause (0 where it starts, 1 where it ends), by default in the middle
// of it — the inverse of getActivePosition for a whole-number position,
// walking the same segment weights. Position -1, where the intro starts, is
// the top of the page.
function getScrollYForPosition(position, pauseAt = 0.5) {
  if (position < 0) return 0;
  const introWeight = introRemoved ? 0 : INTRO_WEIGHT;
  const weight = introWeight + position * (PAUSE_WEIGHT + RAMP_WEIGHT) + PAUSE_WEIGHT * pauseAt;
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;
  return (weight / getTimelineWeight()) * Math.max(scrollableHeight, 0);
}

// What the Info/Index panels (panels.js) and the opening grid
// (intro-grid.js) need from the stack, and nothing more: parking it on a
// three-row frame behind the panels, knowing which row is the bottom one,
// swapping that row's photos for a project's own, and the photos to open with.
export const gallery = {
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
  // A project clicked in the Index (panels.js): the gallery switches to
  // Projekte and opens that project's row in the middle. projectIndex is
  // its place in the projects, which is also its row's there.
  showProject(projectIndex) {
    setView("projekte", projectIndex);
  },
  releaseImages: releaseGalleryImages,
  setRowPhotos(rowIndex, photos) {
    rowPhotoOverrides[rowIndex] = photos && photos.length ? photos : null;
    rowControllers[rowIndex].remount();
  },
  // Every photo in the rows of the view showing now.
  getPhotos() {
    return rowPhotos.flat();
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
  updateSnapPoints();
  update();
  // update() leaves the fullscreen column alone — nothing about it changes
  // while fullscreen is open and the page is merely scrolling. A resize is the
  // exception, since every size it laid out came from the viewport.
  if (fullscreenRowIndex !== null) rowControllers[fullscreenRowIndex].refreshColumnLayout();
}

// Plays the logo's shrink into the nav by itself, once the opening photo
// grid (intro-grid.js) has finished and calls gallery.playIntro. It scrolls
// the page to row 0's pause, the same place scrolling by hand gets to, so
// the logo, the first row and the titles still move in lockstep, and
// scrolling back to the top still brings the large logo back. Runs once per
// page load. Any scroll input from the visitor, or opening a panel, cancels
// it mid-way.
const INTRO_AUTOPLAY_DURATION_MS = 500;

gallery.playIntro = (function setUpIntroAutoplay() {
  let started = false;
  let cancelled = false;


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
        // The autoplay's own scrolling isn't the visitor's (see updateTopNav).
        lastScrollY = window.scrollY;
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

// --- Settling -----------------------------------------------------------------
// A scroll that comes to rest part-way through a handover, with two rows each
// half open, is finished for the visitor: once the page stops (scrollend, or
// SETTLE_IDLE_MS without a scroll where there's no scrollend) it glides on to
// the next row in the direction they were scrolling, or back to the row they
// were leaving if they were scrolling back. The glide eases to a stop where
// that row is fully open, then steps on to the middle of its pause (nothing
// moves on screen within a pause), which is where the rest of this file parks
// a row too, so the next scroll either way has the same stretch to go before
// anything moves. The intro is one more handover: stopping half-way through
// the large logo's shrink finishes it, like the autoplay does, or brings the
// large logo back. The visitor scrolling again, a panel opening or the view
// switching lets go of the glide, and the page settles again once it stops.
let settleFrame = null;
let settleTimeoutId = null;
// The scrollY the glide last set, to tell when something else scrolls.
let settleScrollY = 0;
// A finger is on the screen, so the page is the visitor's until it lifts.
let pageTouched = false;

const HAS_SCROLLEND = "onscrollend" in window;
// The keys that scroll the page, which take over from a glide the way a
// wheel does.
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

function stopSettle() {
  cancelAnimationFrame(settleFrame);
  settleFrame = null;
}

function scheduleSettle() {
  window.clearTimeout(settleTimeoutId);
  settleTimeoutId = window.setTimeout(settle, SETTLE_IDLE_MS);
}

// The visitor taking over mid-glide. What they do next normally scrolls the
// page, which settles again once it stops; the timer covers it when it
// doesn't (Space on a focused button, say).
function interruptSettle() {
  if (settleFrame === null) return;
  stopSettle();
  scheduleSettle();
}

function settle() {
  // Not on a phone: the page stops wherever the phone's own momentum leaves
  // it, rather than gliding on to a row after it.
  if (isMobile) return;
  if (settleFrame !== null || pageTouched || introAutoplayRunning || fullscreenRowIndex !== null) return;
  const body = document.body.classList;
  if (body.contains("panels-open") || body.contains("is-intro-grid")) return;

  const position = getScrollActivePosition();
  const fromRow = Math.floor(position);
  const t = position - fromRow;
  // Resting on a row already.
  if (t < 0.001 || t > 0.999) return;

  // An instant scroll (no smooth scrolling, Home / End) ends before update()
  // has seen it, so the direction it left can still be the one before it.
  const unseenPx = window.scrollY - lastScrollY;
  const forward = unseenPx !== 0 ? unseenPx > 0 : lastScrollDirection > 0;
  const target = forward ? fromRow + 1 : fromRow;
  // Where the target row is first fully open, coming from this side.
  const edgeY = getScrollYForPosition(target, forward ? 0 : 1);
  const restY = getScrollYForPosition(target);
  const fromY = window.scrollY;
  const durationMs = getSettleDurationMs(forward ? 1 - t : t);
  const startTime = performance.now();
  settleScrollY = fromY;

  function tick(now) {
    // Something else has scrolled the page since the last frame.
    if (Math.abs(window.scrollY - settleScrollY) > 1) {
      settleFrame = null;
      return;
    }
    const k = Math.min(1, (now - startTime) / durationMs);
    window.scrollTo(0, k < 1 ? lerp(fromY, edgeY, easeInOut(k)) : restY);
    // The glide's own scrolling isn't the visitor's (see updateTopNav).
    settleScrollY = lastScrollY = window.scrollY;
    if (k < 1) {
      settleFrame = requestAnimationFrame(tick);
      return;
    }
    settleFrame = null;
    update();
  }
  settleFrame = requestAnimationFrame(tick);
}

function startSettling() {
  if (HAS_SCROLLEND) {
    window.addEventListener("scrollend", settle);
    // A flick's momentum after the finger lifts ends in a scrollend of its
    // own, so it doesn't need the release's timer below.
    window.addEventListener("scroll", () => window.clearTimeout(settleTimeoutId), { passive: true });
  } else {
    window.addEventListener("scroll", scheduleSettle, { passive: true });
  }

  window.addEventListener("wheel", (event) => {
    if (event.deltaY !== 0) interruptSettle();
  }, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (SCROLL_KEYS.has(event.key)) interruptSettle();
  });

  // A finger held still mid-handover is still scrolling. On release, a tap
  // (which scrolls nothing, so no scrollend follows) settles by the timer.
  window.addEventListener("touchstart", () => {
    pageTouched = true;
    stopSettle();
    window.clearTimeout(settleTimeoutId);
  }, { passive: true });
  const release = (event) => {
    if (event.touches.length) return;
    pageTouched = false;
    scheduleSettle();
  };
  window.addEventListener("touchend", release, { passive: true });
  window.addEventListener("touchcancel", release, { passive: true });
}

// --- Start and the Projekte / Kategorien switch -------------------------------

// The two views the switch picks between, each a list of rows ({ type,
// category, place, photos }, see lib/gallery/index.js), and the one showing.
let views = {};
let currentView = null;

// Builds the rows for the view to open on and sets everything moving. Called
// once, by startSite in lib/gallery/index.js, with at least one view that has
// rows.
export function startGallery(viewRows, defaultView) {
  views = viewRows;
  currentView = views[defaultView].length ? defaultView : getOtherView(defaultView);
  buildRows(views[currentView]);
  markActiveView();

  viewSwitch.addEventListener("click", () => setView(getOtherView(currentView)));

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("pointermove", followPointerForLogo, { passive: true });
  startSettling();
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
}

function getOtherView(view) {
  return Object.keys(views).find((name) => name !== view);
}

// The switch's label, for the view showing; its aria-label names the one a
// click changes to. data-view turns its icon (see .view-switch in
// panels.css).
const VIEW_LABELS = { kategorien: "Kategorien", projekte: "Projekte" };

function markActiveView() {
  viewSwitch.dataset.view = currentView;
  viewSwitch.querySelector(".view-switch-label").textContent = VIEW_LABELS[currentView];
  viewSwitch.setAttribute("aria-label", `Ansicht wechseln: ${VIEW_LABELS[getOtherView(currentView)]}`);
}

// Shows a view, with row `position` open in the middle: its first row from
// the switch, a project's from the Index (see gallery.showProject). The rows
// are swapped for the view's only if it isn't the one showing already. A
// view with nothing in it (no projects yet, say) can't be picked.
function setView(view, position = 0) {
  if (!views[view] || !views[view].length) return;
  if (fullscreenRowIndex !== null) return;
  if (view !== currentView) {
    currentView = view;
    markActiveView();
    buildRows(views[view]);
    remeasureAndUpdate();
  }
  window.scrollTo(0, getScrollYForPosition(clamp(position, 0, ROW_COUNT - 1)));
  update();
}

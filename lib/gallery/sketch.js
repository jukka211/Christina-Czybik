// The gallery, the homepage's and a project page's. Plain DOM code, as it was
// on the static site: it runs once, when the page loads it in the browser
// (components/Gallery.tsx), and startGallery (the homepage) or
// startProjectGallery (a project page) at the end of this file hands it the
// rows to show. A project page is the homepage's stack standing still, see
// "Project pages" at the end of this file.
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
// Whether the opening photo grid (intro-grid.js) plays on this visit: only
// on a start page (the homepage, or /test-startpage, see startGallery), not
// on a back / forward return, and not when the page opens straight onto a
// panel (index.html#info, e.g. from the legal page).
export const INTRO_GRID_WILL_RUN =
  ["/", "/test-startpage"].includes(window.location.pathname) &&
  !IS_HISTORY_NAVIGATION &&
  !/(^#|[+,])(info|index)\b/i.test(window.location.hash);
// How the homepage's opening grid (intro-grid.js) hands over to the start
// page:
//   "slide"  everything goes up a row, as a try: the grid's top row slides
//            out of the screen, the logo's row rises into its place, the
//            logo shrinking into the nav as it goes, and row 0, in the
//            bottom row's place, rises into the middle and opens
//            (gallery.playIntro, the logo's shrink and rise in one step).
//   "logo"   the grid's photos disappear, and the large logo then shrinks
//            and rises into the nav, row 0 coming up to meet it
//            (updateIntroLogo, gallery.playIntro).
//   "fade"   the large logo fades away with the grid's photos, and the start
//            page fades in as it is, row 0 open and the logo in place
//            (gallery.showStart).
// Read through getIntroEnding.
const INTRO_ENDING = "slide";
// Whether it slides on a phone too. It fades there for now: a phone's grid
// has two rows of photos above the logo and two below, and its row 0, small
// at the foot of the screen, is far larger than the grid's photos.
const INTRO_SLIDES_ON_PHONE = false;

// INTRO_ENDING as it is on this screen.
export function getIntroEnding() {
  if (INTRO_ENDING === "slide" && MOBILE_QUERY.matches && !INTRO_SLIDES_ON_PHONE) return "fade";
  return INTRO_ENDING;
}

// Vertical: one row expands to MAX_VH, the rest collapse to MIN_VH, and the
// expanded row moves down the column as the page scrolls (a "distance from
// activePosition" stack, same shape as the card-stack algorithm in
// HomePageClient.tsx — mod/wrapped distance, cumulative-offset stacking —
// just applied to whole rows instead of individual cards).
//
// Horizontal (outside fullscreen): within a row, images are pulled
// dynamically from the row's own photos (see rowStates) as needed (not a
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

// How many rows the stack has. Kept by insertRow and removeRow.
let ROW_COUNT = 0;
// Desktop's fixed row sizes. Mobile derives its own from the viewport *width*
// instead (see refreshMetrics), so MAX_VH/MIN_VH — and the image widths
// derived from them below — are `let`s refreshed on every resize rather than
// module constants. Everything downstream still just reads them.
const DESKTOP_MAX_VH = 75;
const DESKTOP_MIN_VH = 6;
// How many times smaller than its row a small photo is drawn on a desktop
// (in the small rows, and either side of the large one): --small-photo-shrink
// in theme.css, read by refreshMetrics.
let smallPhotoShrink = 1;
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
// the "y") as a share of the small rows' height: the same height. (Their
// photos are drawn smaller within them, see --small-photo-shrink.) The
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
// it, clicking left/right of that center band steps focus instead. None for
// now, so fullscreen is off: a click anywhere on a row steps it, with no
// zoom cursor anywhere. Set to 10 to give the middle band back to
// fullscreen.
const FULLSCREEN_CLICK_ZONE_VW = 0;
// Mobile's counterpart: none for now, so a tap anywhere on the open row steps
// it, the left half back and the right half on, and nothing opens fullscreen
// on a phone. Set to 10 to give the middle band back to fullscreen.
const MOBILE_FULLSCREEN_CLICK_ZONE_VW = 0;
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
// A phone's pause (see getPauseWeight): next to nothing. There the
// browser's scroll snapping holds a row open, and a pause would only be a
// stretch at the start of every drag where the finger moves and the photos
// don't. This much leaves the snap point a few px of slack either side.
const MOBILE_PAUSE_WEIGHT = 0.02;
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
  // From wherever the stack ends up once the intro is over.
  return 50 - bottomVh - MIN_VH / 2 - shiftVh - getMobileTopAlignVh();
}
// Where in the intro the row titles start fading in. The nav itself is at
// rest and fully visible from the opening frame — only the per-row category
// labels hold back, since at the start there's just the one collapsed row
// and its label would sit alone at the bottom of an otherwise empty screen.
const INTRO_TITLE_FADE_START = 0.55;
// How far above the middle of the screen the full-width logo starts, as a
// share of the screen's height.
const INTRO_LOGO_RAISE = 0.03;
// How wide the logo starts, as a share of the full width it can span:
// --intro-logo-width in theme.css, read by refreshMetrics.
let introLogoWidthShare = 1;
// The intro plays in two steps: first the full-width logo shrinks to its
// nav size where it is, in the middle of the screen, then it rises into the
// nav, row 0 coming up from the foot of the screen to meet it. This is the
// share of the intro the first step takes. Each step eases in and out, so
// the logo comes to rest for a moment between the two. Not when the intro
// slides (INTRO_ENDING), where the logo shrinks as it rises, in one step
// with the rows.
const INTRO_SHRINK_SHARE = 0.5;

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
// Below this width the stack switches to the phone layout: the open row at
// the top, right under the nav, its image large across the full width, and
// the next row's image small below it — with a single image per row instead
// of a five-image horizontal stack, stepped by swiping or by a tap on either
// half of it. The row before the open one waits off screen above.
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
// The most of the open row's height the small image below it may take, on a
// screen with room to spare: it stays the smaller of the two.
const MOBILE_SMALL_MAX_SHARE = 0.5;
// Clear space left between the small image's bottom edge and the foot of the
// gallery, when the gap is free to honour it — see getRowGapVh, which widens
// past this where it has to in order to keep the row after it off screen
// entirely.
const MOBILE_EDGE_MARGIN_VH = 6;
// Space between the Info / Index buttons and the top of the open row, which
// a portrait photo fills and a landscape one sits in the middle of. While the
// logo is in view, which reaches lower, the row starts LOGO_PADDING_BOTTOM_PX
// under the logo instead (see refreshStackFrame).
const MOBILE_TOP_GAP_PX = 10;
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
// How far *past* the foot of the gallery the row after the small one is
// pushed. Landing it exactly on the edge is what the gap solves for, and a
// subpixel of rounding either way then decides whether a sliver of it shows;
// this is the slack that settles the question.
const MOBILE_FOURTH_CLEARANCE_VH = 1;
// Ceiling on the large image's height. Full width is the rule whatever the
// image's shape, but a portrait frame at full width is 1.5 screens wide worth
// of height, and past some point that can't share the gallery with the small
// image below it at all — on a tablet-width viewport a full-width portrait
// photo would be taller than the screen itself. Past this it's fitted to the
// height instead and stops short of the side edges. Solved for exactly the
// point where the composition runs out: the large image, plus the minimum gap
// and the smallest the small tier is allowed to get, filling the gallery
// below the open row's top (see getMobileRoomVh). A project page's row has
// no small one under it on a phone (see isRowNear), only its own title, so
// it may take the rest.
function getMobileLargeMaxHeightVh() {
  if (projectMode) return getMobileRoomVh() - mobileMinRowGapVh;
  return getMobileRoomVh() - mobileMinRowGapVh - MOBILE_SMALL_MIN_HEIGHT_VH;
}

function getMobileTopGapVh() {
  return (MOBILE_TOP_GAP_PX / viewportHeightPx) * 100;
}

// The room the open row, the gap and the small image below share on a
// phone, in --vh: the gallery from the open row's top down.
function getMobileRoomVh() {
  return 100 - getMobileTopGapVh() - getMobileLogoShiftVh();
}

// How far the logo moves the open row down, in --vh, where it's there to
// stay (see isLogoFixed; refreshStackFrame moves the row). A logo that
// slides away on the way down the page leaves the rows the room to
// themselves.
function getMobileLogoShiftVh() {
  if (!isLogoFixed()) return 0;
  return (Math.max(0, navRestBottomPx - galleryTopPx - MOBILE_TOP_GAP_PX) / viewportHeightPx) * 100;
}

// On a phone, how far the stack moves up from centering the open row to
// putting its top MOBILE_TOP_GAP_PX under the gallery's top.
function getMobileTopAlignVh() {
  return isMobile ? MAX_VH / 2 - 50 + getMobileTopGapVh() : 0;
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

// A trial of the start page on a phone (/test-startpage, see startGallery):
// every row stays open, full width, rather than the one in view growing and
// the rest shrinking, and the page scrolls past them as plain as any page,
// with the photos following the finger and no snapping to a row. Each row
// still steps through its photos under a tap or a swipe. The rows are
// MOBILE_FLAT_ROW_GAP_PX further apart than their titles need. A desktop's
// start page is as ever.
let mobileFlat = false;
const MOBILE_FLAT_ROW_GAP_PX = 16;

function isFlat() {
  return mobileFlat && isMobile;
}

const stackWrapper = document.getElementById("stackWrapper");
const stickyViewport = document.getElementById("stickyViewport");
const topNav = document.getElementById("topNav");
const navCenter = topNav.querySelector(".nav-center");
const navLogo = document.getElementById("navLogo");
// The homepage's footer. A project page has none.
const bottomFooter = document.getElementById("bottomFooter");
const fullscreenTitle = document.getElementById("fullscreenTitle");
const fullscreenTitleName = document.getElementById("fullscreenTitleName");
const fullscreenTitleCount = document.getElementById("fullscreenTitleCount");
// The Info/Index buttons (panels.js), hidden during fullscreen along with
// the rest of the nav.
const panelNav = document.getElementById("panelNav");
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
// a phone what's left of it below the Info / Index buttons with the
// browser's bars showing; the gallery starts at galleryTopPx (see
// --gallery-top in style.css). Read back off a probe that tall, in
// refreshMetrics.
let viewportHeightPx = window.innerHeight;
let galleryTopPx = 0;
let viewportProbe = null;
// Every row's width, in px: the gallery's less the stack's side insets.
// Measured with the rest in refreshMetrics rather than read off each row
// as it's laid out, which on every scroll frame forced the browser to work
// out the whole layout again for each row in turn (see applyLayout).
let rowWidthPx = window.innerWidth;

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

// The same in --scroll-vh, the scroll distance's own unit (theme.css), for
// .stack-wrapper's height.
function scrollVh(value) {
  return `calc(${value} * var(--scroll-vh))`;
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
  const rootStyle = getComputedStyle(document.documentElement);
  smallPhotoShrink = parseFloat(rootStyle.getPropertyValue("--small-photo-shrink")) || 1;
  introLogoWidthShare = parseFloat(rootStyle.getPropertyValue("--intro-logo-width")) || 1;

  // Follows the Info / Index buttons, whose size follows the type.
  if (panelNav) {
    const indexToggle = panelNav.querySelector('.panel-toggle[data-panel="index"]');
    if (indexToggle) stackInsetTopPx = panelNav.offsetTop + indexToggle.offsetTop + indexToggle.offsetHeight + STACK_INSET_TOP_GAP_PX;
  }

  if (isMobile) {
    // Measured before anything else, because every size below is bounded by
    // it — see getMobileLargeMaxHeightVh and getMobileSmallHeightVh.
    // From whichever titles are showing: one more than a few rows from the
    // open one is display: none (see showRow), and measures 0.
    const titleHeightPx = Math.max(0, ...rowTitles.map((titleEl) => titleEl.offsetHeight));
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
  const stackSidePx = isMobile ? 0 : STACK_INSET_SIDE_PX;
  stickyViewport.style.setProperty("--stack-side", `${stackSidePx}px`);
  rowWidthPx = stickyViewport.clientWidth - stackSidePx * 2;
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

  if (isMobile) {
    // The logo reaches a little past the buttons the gallery starts under,
    // and the open row starts under whichever is lower.
    stackShiftPx = Math.max(0, navBottomPx - galleryTopPx - MOBILE_TOP_GAP_PX);
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

// Each row treats its photos as an infinite, wrapping strip — poolIndex is
// a plain unbounded integer (it just keeps counting up/down as you click
// further in either direction) and only the photo lookup wraps, via mod.
// poolIndex 0 is the row's first photo, the one centered when the row opens,
// as sorted in the Studio.
//
// A row can also be handed its own short list of photos for a while (see
// previewProject below — the Index panel does this to preview a project in
// the bottom row). That list wraps the same way, offset by VISIBLE_RANGE so
// its first photo is the leftmost one mounted rather than the centered one.
//
// A photo is { url, aspect }: its Sanity CDN URL and its width / height.
// Each row's state holds both lists and its title ({ photos, override,
// title }, see insertRow). It goes with the row, not with its place in the
// stack, which a project page changes by adding and taking away rows around
// it (see playHandover).
let rowStates = [];

function getRowPhotoList(state) {
  return state.override || state.photos;
}

// Where poolIndex falls in the row's list (0-based).
function getRowPhotoIndex(state, poolIndex) {
  const offset = state.override ? VISIBLE_RANGE : 0;
  return mod(poolIndex + offset, getRowPhotoList(state).length);
}

function getRowPhoto(state, poolIndex) {
  return getRowPhotoList(state)[getRowPhotoIndex(state, poolIndex)];
}

// A counter, "07/75": photo number (1-based) of how many.
function formatCount(number, total) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(number)}/${pad(total)}`;
}

// The row title's counter: which photo poolIndex is, of how many.
function getRowPhotoCount(state, poolIndex) {
  return formatCount(getRowPhotoIndex(state, poolIndex) + 1, getRowPhotoList(state).length);
}

// The row title's dots on a phone, as on Instagram: one per photo up to
// ROW_DOTS, the current one black (see .row-title-dots in style.css). With
// more photos than dots, the black one moves along to the middle dot and
// stays there while the photos pass under it, moving on to the last dots
// only for the last photos.
const ROW_DOTS = 5;

function getRowDotIndex(state, poolIndex) {
  const photoIndex = getRowPhotoIndex(state, poolIndex);
  const total = getRowPhotoList(state).length;
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

// The photo the gallery opens on, the first one anybody sees large: once the
// homepage's opening grid has gone, or as a project page opens. It starts out
// as its large copy (see createPoolImage), so it's sharp from the start
// rather than sharpening a moment later. On the homepage it's held like the
// rest, but only until the grid's own first photos are in (intro-grid.js
// calls releaseOpeningPhoto then), so it's there as the grid ends rather than
// only starting to load then.
let openingImage = null;
// The row it's in: the homepage's first, a project page's middle one (see
// startGallery and startProjectGallery).
let openingRowState = null;

function releaseOpeningPhoto() {
  const src = openingImage && heldImages.get(openingImage);
  if (!src) return;
  heldImages.delete(openingImage);
  openingImage.src = src;
}

// Sanity's image CDN scales each photo on request, in two sizes here. The
// large one fits the box the largest a photo is ever drawn on this screen
// takes, in device pixels, rounded up so visitors with similar screens share
// the CDN's cached copies. On a desktop that's fullscreen: the screen's long
// edge either way, in 400px steps, up to 2400px. On a phone a photo is never
// drawn wider than the screen less its side padding, nor taller than a
// portrait one at that width (see getMobileRowHeightVh), so the box is that
// shape, in 200px steps: a landscape photo comes at the width it's drawn at
// (about 1200px on a 3x iPhone) rather than 1600px, a third as many pixels
// again for nothing. Both capped at 1600px there, since every pixel more is
// one more for the phone to load and decode mid-scroll.
const LARGE_PHOTO_BOX = (() => {
  const dpr = window.devicePixelRatio || 1;
  const roundUp = (px, step) => Math.ceil(px / step) * step;
  if (!MOBILE_QUERY.matches) {
    const edgePx = Math.min(2400, roundUp(Math.max(window.screen.width, window.screen.height) * dpr, 400));
    return { w: edgePx, h: edgePx };
  }
  const widthPx = (document.documentElement.clientWidth || window.innerWidth) - MOBILE_SIDE_PADDING_PX * 2;
  return {
    w: Math.min(1600, roundUp(widthPx * dpr, 200)),
    // A 2:3 portrait photo's height at that width.
    h: Math.min(1600, roundUp(widthPx * 1.5 * dpr, 200)),
  };
})();
// The small one is enough for the small tier on any screen, and is what a
// photo starts out as: most photos on screen are small ones, in collapsed
// rows or beside the large photo, and only a few are ever looked at large.
// It swaps to the large size once it's drawn bigger than this (see
// showLargePhotoIfNeeded).
const SMALL_PHOTO_PX = 480;

function getPhotoUrl(photo, large) {
  const box = large ? LARGE_PHOTO_BOX : { w: SMALL_PHOTO_PX, h: SMALL_PHOTO_PX };
  return sanityImageUrl(photo.url, { w: box.w, h: box.h, fit: "max", q: 80 });
}

// Which photo each mounted image shows, and which ones have been given their
// large copy already.
const imagePhotos = new WeakMap();
const largeImages = new WeakSet();

// large: start with the large copy straight away (the fullscreen column,
// where every photo is shown big).
function createPoolImage(state, poolIndex, large = false) {
  const photo = getRowPhoto(state, poolIndex);
  const img = document.createElement("img");
  imagePhotos.set(img, photo);
  const opening = !openingImage && state === openingRowState && poolIndex === 0;
  if (opening) openingImage = img;
  if (large || opening) largeImages.add(img);
  setImageSrc(img, getPhotoUrl(photo, large || opening));
  img.alt = "";
  // Neither lazy nor async: the gallery only makes the photos it's about to
  // show (the rows near the screen, one photo either side), so each is
  // fetched straight away rather than once it's nearly in view, and a photo
  // that changes its source (small copy to large) changes in one frame,
  // never showing blank between the two.
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
  // a scroll frame. The small copy stays painted underneath for the swap,
  // as the photo's background (fitted like the photo itself, see .row > img
  // in style.css): Safari, and so every browser on an iPhone, can still
  // leave a large image blank for a moment once it's in the photo, while it
  // prepares it for the screen, and the photo would blink white instead of
  // sharpening. It goes again once the large copy has been on screen for a
  // couple of frames: a photo with nothing but its image can be handed to
  // the screen as it is, rather than painted, which is what lets the phone
  // scale it smoothly (see styleMobileImage).
  const loader = new Image();
  loader.src = src;
  loader
    .decode()
    .catch(() => {})
    .then(() => {
      if (!img.isConnected) return;
      if (img.currentSrc) img.style.backgroundImage = `url("${img.currentSrc}")`;
      img.src = src;
      return img.decode();
    })
    .catch(() => {})
    .then(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        img.style.backgroundImage = "";
      }));
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
// its own shape (a portrait one is simply narrower than a landscape one, not
// taller): whatever the gallery has left below the open row and its title,
// down to MOBILE_EDGE_MARGIN_VH above its foot. So the small image grows into
// the room as the browser's bars shrink away and gives way as they come back
// (the gallery's height follows them, see style.css), and never reaches up
// into the title, which the gap keeps clear (see getRowGapVh). At least
// MOBILE_SMALL_MIN_HEIGHT_VH, at most MOBILE_SMALL_MAX_SHARE of the open row.
function getMobileSmallHeightVh(activeLargeHeightVh) {
  const roomVh = getMobileRoomVh() - activeLargeHeightVh - mobileMinRowGapVh - MOBILE_EDGE_MARGIN_VH;
  return clamp(roomVh, MOBILE_SMALL_MIN_HEIGHT_VH, activeLargeHeightVh * MOBILE_SMALL_MAX_SHARE);
}

// A small photo's box on a desktop: a collapsed row's box (IMG_MIN_WIDTH_VH
// by MIN_VH), smallPhotoShrink times smaller, in the middle of it.
function getSmallPhotoSize() {
  return { width: IMG_MIN_WIDTH_VH / smallPhotoShrink, height: MIN_VH / smallPhotoShrink };
}

// The two-tier size (at full row size — see getImageSize for the blend with
// the row's own collapsed/active state) for an image `distance` steps from
// the centered one: the centered image is large, everything else visible
// (up to VISIBLE_RANGE either side) is getSmallPhotoSize — the same "small"
// size a fully collapsed row's images already use, so the small images look
// consistent whether they're next to a large one in the active row or
// uniformly small in a collapsed one. Not used at all in fullscreen mode —
// see applyLayout, which sizes every image uniformly there instead.
function getStackSize(distance) {
  if (distance === 0) return { width: IMG_MAX_WIDTH_VH, height: MAX_VH };
  return getSmallPhotoSize();
}

// Blends the stack tier size toward the row's own collapsed size by
// rowDistance (0 = row fully active, 1 = fully collapsed) — the large tier
// shrinks toward the small size as the row collapses; the small tier is
// already that, so this is a no-op for it.
function getImageSize(distance, rowDistance) {
  const stack = getStackSize(distance);
  const small = getSmallPhotoSize();
  return {
    width: lerp(stack.width, small.width, rowDistance),
    height: lerp(stack.height, small.height, rowDistance),
  };
}

// Drives one row's whole horizontal system off a single index — activeIndex
// — instead of measured geometry, so there's no feedback loop (measuring
// position to decide size, when position is itself a result of every
// image's size, never settles and thrashes layout every frame). No
// animation here — activeIndex jumps immediately on click and the row
// re-renders in the same tick, so switching is an instant snap, not a
// transition.
//
// On a project page the rows above and below the middle one are "link" rows
// (see setProjectRoles): laid out the same, but a click anywhere on one opens
// its project (see openNeighbourProject). So are a desktop start page's (see
// setStartRoles), where a click scrolls the page on to the row (see
// glideToRow). A row changes role as the rows move through the stack.
//
// state: the row's photos and title (see insertRow). titleEl: its title.
function setUpRow(row, state, titleEl) {
  const countEl = titleEl.querySelector(".row-title-count");
  const dotEls = [...titleEl.querySelector(".row-title-dots").children];
  let role = "stack";
  let dotsState = "";
  let activeIndex = 0;
  let rowDistance = 1;
  let isFullscreen = false;
  // A link row with the pointer over it: its title shows (see
  // updateRowTitles).
  let hovered = false;

  // On a phone a link row's title, always showing under it, opens its
  // project too: more for a finger to find than the small row alone (see
  // .row-title.is-link in style.css, which lets it take taps there).
  titleEl.addEventListener("click", () => {
    if (role !== "link" || isHandingOver()) return;
    openLinkRow(rows.indexOf(row));
  });
  // Live horizontal finger travel during a mobile swipe (px, positive =
  // dragged right), folded into applyLayout's mobile branch so the images
  // track the finger; back to 0 the moment the gesture ends. The swipe nudge
  // (see nudge below) moves the images through it too.
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
  //
  // While the row is on its way between open and small (the page partway
  // from one row to the next), an image keeps its open size and is scaled
  // down to its size of the moment by its transform instead: each image is
  // a layer of its own on a phone (will-change, see style.css), so the
  // browser only rescales that layer frame by frame, rather than laying out
  // and painting the photo again at a new size on every one, which is what
  // made the handover heavy on an iPhone. At either end it's laid out at its
  // real size again, so a small one's drawn sharp at that size.
  function styleMobileImage(img, poolIndex, rowWidthPx) {
    const aspect = getImageAspect(getRowPhoto(state, poolIndex));
    const openHeightVh = getMobileRowPhotoHeightVh(aspect);
    const heightVh = lerp(openHeightVh, MIN_VH, rowDistance);
    const boxHeightVh = rowDistance > 0 && rowDistance < 1 ? openHeightVh : heightVh;
    img.style.height = vh(boxHeightVh);
    img.style.width = vh(boxHeightVh * aspect);
    showLargePhotoIfNeeded(img, heightVh * aspect, heightVh, isUpcoming(poolIndex));
    const offsetPx = (poolIndex - activeIndex) * rowWidthPx + dragOffsetPx;
    const scale = heightVh / boxHeightVh;
    img.style.transform = `translate(calc(-50% + ${offsetPx}px), -50%)${scale === 1 ? "" : ` scale(${scale})`}`;
  }

  // Rides the current image's right edge, SWIPE_HINT_INSET_PX inside it
  // (dragged along with it mid-swipe), and fades out as the row collapses,
  // so only the large row carries one.
  function placeSwipeHint() {
    const aspect = getImageAspect(getRowPhoto(state, activeIndex));
    const widthPx = lerp(getMobileRowPhotoHeightVh(aspect), MIN_VH, rowDistance) * aspect * (viewportHeightPx / 100);
    const rightEdgePx = widthPx / 2 + dragOffsetPx;
    swipeHint.style.transform = `translate(calc(${rightEdgePx - SWIPE_HINT_INSET_PX}px - 100%), -50%)`;
    swipeHint.style.opacity = `${clamp(1 - rowDistance * 2, 0, 1)}`;
    swipeHint.style.visibility = rowDistance >= 0.5 ? "hidden" : "";
  }

  // The large photo while this row is the open one (more than halfway
  // grown), and the ones either side of it once it's all the way open: see
  // showLargePhotoIfNeeded. Not the neighbours any sooner, so their large
  // copies don't load and decode while the row is still growing. On a phone
  // the large photo has usually had its large copy since before the row
  // started to grow (see prepareLargePhoto).
  function isUpcoming(poolIndex) {
    if (poolIndex === activeIndex) return rowDistance < 0.5;
    return rowDistance === 0 && Math.abs(poolIndex - activeIndex) === 1;
  }

  function applyLayout() {
    // The title counts along as the photos step, however they do: a click, a
    // swipe, auto-advance, or the row resetting to its first photo.
    const count = getRowPhotoCount(state, activeIndex);
    if (countEl.textContent !== count) countEl.textContent = count;
    const dotCount = Math.min(getRowPhotoList(state).length, ROW_DOTS);
    const activeDot = getRowDotIndex(state, activeIndex);
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

    // The row's width is measured once per layout of the page (rowWidthPx,
    // see refreshMetrics), not read here: a read here, after the rows were
    // just moved and resized, would make the browser work out the layout
    // again on the spot, for every row on every scroll frame. Nor does
    // anything here read layout after a freshly created image is in the
    // document, which matters too: a read then flushes style with that image
    // still untransformed, parked at the row's centre (left: 50%) for one
    // resolved style, and the position set a moment later becomes something
    // to transition *from* — during a swipe's settle window the image would
    // visibly fly out to its place from the middle of the screen.
    //
    // Sizes are set in vh, but spreading images across the row's actual width
    // needs both in the same unit, hence the vh->px rate alongside it.
    const vhToPx = viewportHeightPx / 100;

    for (let i = coreMin; i <= coreMax; i += 1) {
      if (mounted.has(i)) continue;
      const img = createPoolImage(state, i);
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

    if (Math.abs(event.clientX - rowCenterX) < fullscreenZoneHalfWidthPx) return "center";
    return event.clientX - rect.left < rect.width / 2 ? "left" : "right";
  }

  // Outside fullscreen: clicking the center zone opens it; clicking
  // left/right of it steps focus that direction instead. Inside
  // fullscreen: navigation is by mouse wheel (below), not click, so any
  // click just closes it. On a phone a tap steps, see below. A link row
  // opens its project, or on a start page scrolls on to it, wherever it's
  // clicked.
  row.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    if (isFullscreen) {
      setFullscreenRow(rows.indexOf(row));
      return;
    }

    // A project page's rows wait while one project hands over to the next.
    if (isHandingOver()) return;

    if (role === "link") {
      // It's on its way into the middle, without the pointer's tint.
      row.classList.remove("is-pressed");
      setHoverHalf(null);
      setHovered(false);
      openLinkRow(rows.indexOf(row));
      return;
    }

    const zone = getZone(event);
    if (isMobile) {
      // A tap steps the open row, sliding like a finished swipe, which is
      // also how a visitor finds out the row moves, so the nudge has done
      // its job (dismissSwipeHint). A smaller row's tap does nothing: a step
      // would hardly show on its image. Either way the tap feedback (see
      // touchstart) goes as the finger lifts.
      row.classList.remove("is-pressed");
      if (rowDistance >= 0.5) return;
      activeIndex += zone === "left" ? -1 : 1;
      // From wherever a nudge the finger caught had got to (see endSwipe).
      stopGlide();
      dragOffsetPx = 0;
      dismissSwipeHint();
      settleSwipe();
      update();
      return;
    }
    if (zone === "center") {
      setFullscreenRow(rows.indexOf(row));
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
  // only, see .row.is-hover-left / -right in style.css). A link row tints
  // all over, with a hand, and shows its title.
  row.addEventListener("mousemove", (event) => {
    if (isFullscreen) {
      row.style.cursor = "zoom-out";
      setHoverHalf(null);
      return;
    }

    if (role === "link") {
      const clickable = !isHandingOver();
      row.style.cursor = clickable ? "pointer" : "";
      setHoverHalf(clickable && !isMobile ? "all" : null);
      setHovered(clickable);
      return;
    }

    const zone = getZone(event);
    row.style.cursor = zone === "center" ? "zoom-in" : zone === "left" ? "w-resize" : "e-resize";
    setHoverHalf(zone === "center" || isMobile ? null : zone);
  });

  row.addEventListener("mouseleave", () => {
    setHoverHalf(null);
    setHovered(false);
  });

  // half: "left", "right", "all" (a link row), or null for none.
  function setHoverHalf(half) {
    row.classList.toggle("is-hover-left", half === "left");
    row.classList.toggle("is-hover-right", half === "right");
    row.classList.toggle("is-hover-all", half === "all");
  }

  // The titles are laid out with the rows, so the page is, again.
  function setHovered(value) {
    if (hovered === value) return;
    hovered = value;
    scheduleUpdate();
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
  // Where the images were when the finger landed: 0, unless it caught them
  // mid-nudge.
  let dragBasePx = 0;

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
    if (role === "link") {
      row.classList.remove("is-pressed");
      return;
    }
    if (!wasSwiping) {
      // A tap that caught a nudge: the images go back to where they rest.
      if (dragOffsetPx !== 0 && glideFrame === null) glideBack();
      return;
    }

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
      // A finger landing mid-nudge catches the images where they've got to,
      // rather than having them jump back under it.
      stopGlide();
      dragBasePx = dragOffsetPx;
      // Tap feedback (.row.is-pressed in style.css): on from the first touch,
      // dropped as soon as the gesture turns out to be a swipe or a scroll,
      // otherwise held until the tap's click.
      row.classList.add("is-pressed");
    },
    { passive: true },
  );

  row.addEventListener(
    "touchmove",
    (event) => {
      if (!isMobile || isFullscreen || touchAxis === "y" || event.touches.length !== 1) return;
      // A link row doesn't swipe: a tap opens its project.
      if (role === "link") return;

      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;

      if (touchAxis === null) {
        if (Math.abs(dx) < TOUCH_AXIS_LOCK_PX && Math.abs(dy) < TOUCH_AXIS_LOCK_PX) return;
        touchAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        row.classList.remove("is-pressed");
        if (touchAxis === "y") {
          // A scroll that caught a nudge lets go of it.
          if (dragOffsetPx !== 0) glideBack();
          return;
        }
      }

      event.preventDefault();
      suppressNextClick = true;
      dragOffsetPx = dragBasePx + dx;
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

  // The swipe nudge (see swipeNudge): the images slide part of the way over
  // to the next photo and back, through dragOffsetPx the way a finger drags
  // them, so a real finger landing on them mid-way can catch them (see
  // touchstart). Once per row, and only once the next photo has loaded, so
  // there's something to see.
  let nudged = false;
  let nudging = false;
  let glideFrame = null;

  function stopGlide() {
    cancelAnimationFrame(glideFrame);
    glideFrame = null;
  }

  // Moves the images along offsetAt(t), in px, as t runs from 0 to 1 over
  // durationMs.
  function glide(durationMs, offsetAt) {
    stopGlide();
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      dragOffsetPx = offsetAt(t);
      applyLayout();
      glideFrame = t < 1 ? requestAnimationFrame(tick) : null;
    }
    glideFrame = requestAnimationFrame(tick);
  }

  // From wherever the images are back to where they rest, as quickly as a
  // swipe settles.
  function glideBack() {
    nudging = false;
    const fromPx = dragOffsetPx;
    glide(SWIPE_SETTLE_MS, (t) => lerp(fromPx, 0, easeInOut(t)));
  }

  function nudge() {
    if (nudged || isBusy() || getRowPhotoList(state).length < 2) return false;
    const next = mounted.get(activeIndex + 1);
    if (!next || !next.complete || !next.naturalWidth) return false;
    nudged = true;
    nudging = true;
    const peekPx = -row.clientWidth * SWIPE_NUDGE_FRACTION;
    glide(SWIPE_NUDGE_MS, (t) => peekPx * getSwipeNudgeShare(t));
    return true;
  }

  // A finger is on the row, it's still being dragged, or it's gliding, so
  // auto-advance and the nudge mustn't move it out from under that.
  function isBusy() {
    return touchAxis !== null || dragOffsetPx !== 0 || glideFrame !== null;
  }

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
      const img = createPoolImage(state, i, true);
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
            const aspect = getImageAspect(getRowPhoto(state, poolIndex));
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
    const count = getRowPhotoCount(state, Math.round(columnPosition));
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
    isBusy,
    nudge,
    // The current photo's large copy, while the row is still small: on a
    // phone, for the rows either side of the one resting open (see update()),
    // so the photo is in, decoded and painted large before the page moves on
    // to it, rather than swapping in halfway through the row growing.
    prepareLargePhoto() {
      const img = mounted.get(activeIndex);
      if (img) showLargePhotoIfNeeded(img, 0, 0, true);
    },
    // Drops every mounted image so the next layout pass mounts fresh ones
    // from whatever getRowPhoto now returns — used when the row's photo
    // list is swapped out from under it (see gallery.previewProject).
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
      // The page moving on mid-nudge cuts it short.
      if (distance > 0 && nudging && glideFrame !== null) glideBack();
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
    // See the link rows at the top. The row starts over without the pointer
    // either way, staying a link included: the rows are about to move, or
    // just have, and the next mousemove says where it is now.
    setRole(nextRole) {
      role = nextRole;
      setHoverHalf(null);
      hovered = false;
      row.style.cursor = "";
      row.classList.remove("is-pressed");
    },
    isLink: () => role === "link",
    isHovered: () => hovered,
    // The row's going from the page (see removeRow): nothing of it runs on.
    dispose() {
      stopGlide();
      stopColumnSettle();
      window.clearTimeout(settleTimeoutId);
    },
  };
}

// Gap between the swipe hint and the right edge of the image it sits on.
const SWIPE_HINT_INSET_PX = 4;

// Mobile's swipe hint (.row-swipe-hint in style.css) is shown until the first
// swipe anywhere on the page actually moves a row on; then it's gone from
// every row for good (until the next page load), and so is the swipe nudge
// (see scheduleSwipeNudge).
function dismissSwipeHint() {
  document.body.classList.add("swipe-hint-dismissed");
}

// The rows, top to bottom, and with each one its title, its controller (see
// setUpRow) and its state (see rowStates).
const rows = [];
const rowTitles = [];
const rowControllers = [];

// Makes a row for rowData ({ type, category, place, photos }) and puts it in
// the stack at `index`. Its title: a label ("Kategorie" for a category's row,
// "Projekt" for a project's, see lib/gallery/index.js), the row's name, its
// place (a project's Ort) and the "current/total" counter, which counts
// along as the row steps (see applyLayout).
function insertRow(index, rowData) {
  const state = {
    photos: rowData.photos,
    override: null,
    title: { type: rowData.type, category: rowData.category, place: rowData.place },
  };

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
  // The texts go in through textContent: project names and places are
  // typed in the Studio, not markup.
  rowTitle.innerHTML = `<span class="row-title-type"></span><span class="row-title-cat"></span><span class="row-title-dots" aria-hidden="true">${"<span>•</span>".repeat(ROW_DOTS)}</span><span class="row-title-pair"><span class="row-title-place"></span><span class="row-title-count"></span></span>`;
  rowTitle.querySelector(".row-title-type").textContent = state.title.type;
  rowTitle.querySelector(".row-title-cat").textContent = state.title.category;
  rowTitle.querySelector(".row-title-place").textContent = state.title.place;
  stickyViewport.appendChild(rowTitle);

  const controller = setUpRow(row, state, rowTitle);
  stickyViewport.appendChild(row);

  rows.splice(index, 0, row);
  rowTitles.splice(index, 0, rowTitle);
  rowControllers.splice(index, 0, controller);
  rowStates.splice(index, 0, state);
  ROW_COUNT = rows.length;
}

// Takes row `index` out of the stack.
function removeRow(index) {
  rowControllers[index].dispose();
  rows[index].remove();
  rowTitles[index].remove();
  [rows, rowTitles, rowControllers, rowStates].forEach((list) => list.splice(index, 1));
  ROW_COUNT = rows.length;
}

// Replaces whatever rows are showing with one per entry in rowsData: on
// start, and on a project page whenever it changes to a project that isn't
// one of its neighbours (see showProject).
function buildRows(rowsData) {
  while (rows.length) removeRow(rows.length - 1);
  rowsData.forEach((rowData) => insertRow(rows.length, rowData));
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
    segments.push({ weight: getPauseWeight(), from: i, to: i });
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
      // An intro that's over but still on the timeline (a phone's, see
      // introOver) reads as row 0 throughout.
      return Math.max(introOver ? 0 : -1, lerp(segment.from, segment.to, t));
    }
    remaining -= segment.weight;
  }

  return ROW_COUNT - 1;
}

// Every row open, on a flat phone start page (see mobileFlat).
function getDistances(activePosition) {
  if (isFlat()) return rows.map(() => 0);
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
// two images the phone layout is defined as, the open row's and the small one
// below it. Two things want a say, and the wider of them wins:
//
//   pinGap  puts the small image's bottom edge MOBILE_EDGE_MARGIN_VH inside
//           the foot of the gallery;
//   hideGap is the narrowest gap that still pushes the row *past* it fully
//           off screen (its near edge lands exactly at the foot of the
//           gallery, and since that leaves the small image's own far edge
//           hideGap above it, it can never crowd it out).
//
// On a phone pinGap is the wider one and the small image sits at the margin;
// on a wide, short screen the large image is half the gallery tall and
// hideGap takes over, spacing the stack out until the row after clears it.
function getRowGapVh(activeLargeHeightVh = MAX_VH) {
  // Every row open (see mobileFlat): a title's room and a little more.
  if (isFlat()) return mobileMinRowGapVh + (MOBILE_FLAT_ROW_GAP_PX / viewportHeightPx) * 100;
  if (isMobile) {
    const roomVh = getMobileRoomVh();
    const pinGap = roomVh - MOBILE_EDGE_MARGIN_VH - activeLargeHeightVh - MIN_VH;
    const hideGap = (roomVh + MOBILE_FOURTH_CLEARANCE_VH - activeLargeHeightVh - MIN_VH) / 2;
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

// The logo's intro, in its two steps (see INTRO_SHRINK_SHARE): shrink, 0 to
// 1, from the full viewport width (or --intro-logo-width's share of it)
// down to its normal nav size, its middle held where it starts, a little
// above the middle of the screen (INTRO_LOGO_RAISE; Figma 39:2 has it
// centered); then rise, 0 to 1, up into
// its place in the nav, in step with the row stack's own intro motion (see
// update()). Both come eased as update() wants them, and when the intro
// slides (INTRO_ENDING) both at once, its middle rising at the rows' pace
// as it shrinks. A transform on .nav-center rather than an animated width,
// so the nav's flex layout never reflows and, more importantly, so the end of
// the intro is the exact identity transform: the logo lands back on its
// real resting position rather than on a separately computed guess at it,
// and there's nothing to jump.
//
// transform-origin is left top (style.css), so scaling holds the logo's
// top-left corner at navLogoMetrics.left; the translate then carries that
// corner to wherever it is for the logo's middle to be where it should.
// Applied in that order — translate written first, so it composes after the
// scale.
function updateIntroLogo(shrink, rise) {
  if (!navLogoMetrics || navLogoMetrics.contentWidth <= 0) return;
  const { left, top, contentWidth, height, navInsetPx } = navLogoMetrics;

  // As wide as the screen less the nav's side padding, or the share of that
  // --intro-logo-width asks for.
  const startWidthPx = (window.innerWidth - navInsetPx * 2) * introLogoWidthShare;
  const scale = lerp(startWidthPx / contentWidth, 1, shrink);
  // Where its middle is: the middle of the screen's width, a little above
  // the middle of its height, until it rises to its middle in the nav.
  const middleXPx = lerp(window.innerWidth / 2, left + contentWidth / 2, rise);
  const middleYPx = lerp(window.innerHeight * (0.5 - INTRO_LOGO_RAISE), top + height / 2, rise);
  const shiftXPx = middleXPx - (contentWidth * scale) / 2 - left;
  const shiftYPx = middleYPx - (height * scale) / 2 - top;

  navCenter.style.transform = `translate(${shiftXPx}px, ${shiftYPx}px) scale(${scale})`;
}

// Fades the row titles in as row 0 rises in the intro's second step (rise
// 0 to 1, see INTRO_TITLE_FADE_START) via a custom property style.css
// reads, rather than writing opacity onto each title individually —
// .row-title's own .nav-hidden fullscreen fade then still wins on
// specificity instead of fighting an inline style. The body class only exists to drop .row-title's
// opacity transition while this is being driven per scroll frame, and to
// stop the blown-up logo swallowing pointer events (see style.css).
function updateIntroUi(rise) {
  const opacity = clamp((rise - INTRO_TITLE_FADE_START) / (1 - INTRO_TITLE_FADE_START), 0, 1);
  document.documentElement.style.setProperty("--intro-title-opacity", `${opacity}`);
  document.body.classList.toggle("is-intro", rise < 1);
}

// Whether the homepage's logo slides out of the way: up out of view on the
// way down the page and back in on the way up (updateTopNav), and in on a
// hover over the top of the screen (followPointerForLogo). On a desktop it
// does; on a phone it stays at the top of the screen for now, as it always
// does on a project page. LOGO_SLIDES_ON_PHONE switches it back on there,
// sliding away on a tap on it too (see startGallery).
const LOGO_SLIDES = false;
const LOGO_SLIDES_ON_PHONE = false;

// The logo's always there, so the gallery is laid out below it.
function isLogoFixed() {
  return projectMode || !(isMobile ? LOGO_SLIDES_ON_PHONE : LOGO_SLIDES);
}

// With LOGO_SLIDES on: once the intro has shrunk the logo into place, it
// slides up out of view (with the white behind it) as you scroll on down,
// and back in as soon as you scroll up, taking the gallery's space with it.
// Going down it leaves in step with the rows (see hideLogoWithHandover), so
// it holds still with them while a row is held at full size and moves only
// as one row hands over to the next. The intro's own movements (its
// autoplay, the jump to row 0 on coming back to the page) end on row 0, so
// they never move it. Coming back it slides in on its own (see slideLogo)
// as soon as the page moves up at all, read from scrollY rather than the
// timeline position, which stands still while a row is held. Hovering the
// top of the screen brings it in too (see followPointerForLogo).
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
  if (event.pointerType !== "mouse" || isLogoFixed()) return;
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
  if (!bottomFooter) return;
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
//
// A project page on a phone shows just its own project's row: there's no room
// for the next one's under it. The two only share the screen while one
// project hands over to the next (see playHandover).
const NEAR_ROW_RANGE = 3;

function isRowNear(index, activePosition) {
  if (projectMode && isMobile && index !== fullscreenRowIndex) return Math.abs(index - activePosition) < 1;
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
//
// On a project page the small rows above and below the middle one are links
// to their projects (.is-link), and their titles, the whole title as the
// middle row has it, say which: shown while the pointer's over the row, and
// on a phone, which only shows a link row on its way in or out (see
// isRowNear). The one below the middle row on a desktop hangs above its row
// instead, the bottom of the screen being right under it. A desktop start
// page's small rows are links the same way (see setStartRoles). position:
// the stack's, where the middle row is.
function updateRowTitles(heights, offsets, distances, near, position) {
  rowTitles.forEach((titleEl, index) => {
    showRow(titleEl, near[index]);
    if (!near[index]) return;
    const rowTopVh = offsets[index] - heights[index] / 2;
    const rowBottomVh = rowTopVh + heights[index];
    const small = distances[index] >= 0.5;
    const link = small && rowControllers[index].isLink();
    const labelled = link && (isMobile || rowControllers[index].isHovered());
    titleEl.style.transform =
      link && !isMobile && index > position
        ? `translateY(calc(${vh(rowTopVh)} - ${ROW_TITLE_GAP_PX}px - 100%))`
        : `translateY(calc(${vh(rowBottomVh)} + ${ROW_TITLE_GAP_PX}px))`;
    titleEl.classList.toggle("is-small", small && !labelled);
    titleEl.classList.toggle("is-link", link);
    // Mobile only, and only for a row that is *entirely* off screen: the
    // phone layout packs the stack tightly enough that a row parked just
    // past the top edge would otherwise show its title just above the open
    // row's image, since a title sits below its own row. Desktop's stack is
    // spaced loosely enough for this never to arise.
    titleEl.classList.toggle("is-offscreen", isMobile && (rowTopVh >= 50 || rowBottomVh <= -50));
  });
}

// A desktop start page's rows either side of the open one (the small ones,
// past halfway shut) are links to it, as a project page's are to their
// projects: tinted all over with the pointer on one, its title showing, and a
// click scrolls the page on to it (glideToRow). Not on a phone, and not
// during the intro. A row only starts over as its role changes, since this
// runs on every layout.
function setStartRoles(distances, activePosition) {
  rowControllers.forEach((controller, index) => {
    const link = !isMobile && activePosition >= 0 && distances[index] >= 0.5;
    if (controller.isLink() !== link) controller.setRole(link ? "link" : "stack");
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
// A project page's stack doesn't scroll: it stands where it's put (see
// projectPosition).
function getScrollActivePosition() {
  if (projectMode) return projectPosition;
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
  // A fixed logo stays where it is (see LOGO_SLIDES).
  if (!isLogoFixed()) updateTopNav(scrollDeltaPx, previousActivePosition, activePosition);
  // Back in place if it had slid away on a desktop window that's since
  // been narrowed to a phone's.
  else if (logoRevealTarget !== 1) slideLogo(1);
  refreshStackFrame();
  const gapVh = getRowGapVh();

  // 0 at the very top of the page (the opening frame), 1 from the moment row
  // 0 is fully active onwards — i.e. how far through the leading intro
  // segment of getActivePosition's timeline the scroll is. Split into the
  // intro's two steps (see INTRO_SHRINK_SHARE): the logo shrinking, with the
  // stack standing where it starts, then the logo rising with row 0 coming
  // up to meet it. So the stack is laid out from stackPosition, which waits
  // at -1 until the rise.
  // When the intro slides (INTRO_ENDING) it's the one step, the logo
  // shrinking as it rises.
  const introProgress = clamp(activePosition + 1, 0, 1);
  const slides = getIntroEnding() === "slide";
  const introShrink = slides ? introProgress : clamp(introProgress / INTRO_SHRINK_SHARE, 0, 1);
  const introRise = slides ? introProgress : clamp((introProgress - INTRO_SHRINK_SHARE) / (1 - INTRO_SHRINK_SHARE), 0, 1);
  const stackPosition = activePosition < 0 ? introRise - 1 : activePosition;

  const distances = getDistances(stackPosition);
  const heights = getHeights(distances);
  // Pushes the whole stack down so the one visible row sits at the bottom of
  // the screen at the start of the intro, easing back to the normal
  // viewport-centered stack by the end of it. Applied to the offsets rather
  // than to .sticky-viewport as a whole so the row titles, which are
  // positioned from these same offsets, come along with it.
  const introRowShiftVh = getIntroRowShiftVh();
  const introShiftVh = (1 - introRise) * introRowShiftVh;
  const topAlignVh = getMobileTopAlignVh();
  const offsets = getOffsets(heights, stackPosition, gapVh).map((offset) => offset + topAlignVh + introShiftVh);

  // Sliding, the logo moves with the rows: the scroll that drives them is
  // eased already (see gallery.playIntro), and easing the logo again would
  // have it lag behind them and then catch up.
  if (slides) updateIntroLogo(introShrink, introRise);
  else updateIntroLogo(easeInOut(introShrink), easeInOut(introRise));
  updateIntroUi(introRise);
  // The opening grid going up with the stack (see gallery.followIntro).
  if (introListener) introListener((introRise * introRowShiftVh * viewportHeightPx) / 100, introRise);

  updateBottomFooter(distances[ROW_COUNT - 1]);
  const near = rows.map((_, index) => isRowNear(index, stackPosition));
  if (!projectMode) setStartRoles(distances, activePosition);
  updateRowTitles(heights, offsets, distances, near, stackPosition);
  // Fullscreen covers the whole viewport with one image at a time, so the
  // top nav (about/index, logo, filter), bottom footer, and row-titles have
  // nothing left to sit above/below — hide all of them for as long as any
  // row is fullscreen (see .nav-hidden in style.css for the shared fade).
  topNav.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  if (panelNav) panelNav.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  if (bottomFooter) bottomFooter.classList.toggle("nav-hidden", fullscreenRowIndex !== null);
  rowTitles.forEach((titleEl) => titleEl.classList.toggle("nav-hidden", fullscreenRowIndex !== null));

  // The reverse of the above: fullscreen-title has nothing to show *except*
  // while a row is fullscreen, so it fades in instead of out (see
  // .fullscreen-title.is-visible in style.css).
  // Just the name (the category's, or the project's) and the counter.
  if (fullscreenRowIndex !== null) {
    fullscreenTitleName.textContent = rowStates[fullscreenRowIndex].title.category;
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

  // A phone resting on a row (or passing through its pause): see
  // prepareLargePhoto.
  if (isMobile && Number.isInteger(activePosition)) {
    rowControllers[activePosition - 1]?.prepareLargePhoto();
    rowControllers[activePosition + 1]?.prepareLargePhoto();
  }

  scheduleSwipeNudge();
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
// holds while the page is between rows (a project page between projects
// too), during the intro, in fullscreen, with a panel open, and while the
// tab is in the background.
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
  if (document.hidden || fullscreenRowIndex !== null || isHandingOver()) return;
  const body = document.body.classList;
  if (body.contains("panels-open") || body.contains("is-intro") || body.contains("is-intro-grid")) return;
  // Only a row resting fully open, not one mid-handover to the next. On a
  // flat start page (see mobileFlat), where every row is open, the one
  // nearest the top.
  const rowIndex = Math.round(lastActivePosition);
  if (rowIndex < 0 || rowIndex >= ROW_COUNT || (!isFlat() && Math.abs(lastActivePosition - rowIndex) > 0.001)) return;
  const controller = rowControllers[rowIndex];
  if (controller.isBusy()) return;
  controller.stepForward();
}

// Swipe nudge, phone only. The open row's photo fills the screen's width and
// the photos beside it are parked a whole screen away, so nothing on screen
// says the row swipes, and the dots under it are easy to miss. So once the
// page has been still on a row for SWIPE_NUDGE_REST_MS, the photo slides
// SWIPE_NUDGE_FRACTION of the row's width towards the next one, showing its
// edge, holds there a moment and slides back (see nudge in setUpRow). Each
// row once, at most SWIPE_NUDGE_MAX times a visit, and never again once the
// visitor has swiped a row on themselves (dismissSwipeHint). All tunable
// purely by feel.
const SWIPE_NUDGE_REST_MS = 800;
const SWIPE_NUDGE_FRACTION = 0.25;
const SWIPE_NUDGE_OUT_MS = 400;
const SWIPE_NUDGE_HOLD_MS = 300;
const SWIPE_NUDGE_BACK_MS = 500;
const SWIPE_NUDGE_MS = SWIPE_NUDGE_OUT_MS + SWIPE_NUDGE_HOLD_MS + SWIPE_NUDGE_BACK_MS;
const SWIPE_NUDGE_MAX = 3;
let swipeNudgeCount = 0;
let swipeNudgeTimeoutId = null;

// How far out the nudge is, 0 at rest and 1 at its peek, t running from 0
// to 1 over SWIPE_NUDGE_MS.
function getSwipeNudgeShare(t) {
  const ms = t * SWIPE_NUDGE_MS;
  if (ms < SWIPE_NUDGE_OUT_MS) return easeInOut(ms / SWIPE_NUDGE_OUT_MS);
  if (ms < SWIPE_NUDGE_OUT_MS + SWIPE_NUDGE_HOLD_MS) return 1;
  return 1 - easeInOut((ms - SWIPE_NUDGE_OUT_MS - SWIPE_NUDGE_HOLD_MS) / SWIPE_NUDGE_BACK_MS);
}

// Run by every update(), so anything that moves the stack (a scroll, a swipe,
// the page snapping to a row, a photo arriving) starts the wait over.
function scheduleSwipeNudge() {
  window.clearTimeout(swipeNudgeTimeoutId);
  if (!isMobile || swipeNudgeCount >= SWIPE_NUDGE_MAX || document.body.classList.contains("swipe-hint-dismissed")) return;
  swipeNudgeTimeoutId = window.setTimeout(swipeNudge, SWIPE_NUDGE_REST_MS);
}

function swipeNudge() {
  if (document.hidden || pageTouched || fullscreenRowIndex !== null) return;
  const body = document.body.classList;
  if (body.contains("panels-open") || body.contains("is-intro") || body.contains("is-intro-grid")) return;
  // Only a row resting fully open, not one mid-handover to the next. On a
  // flat start page (see mobileFlat), where every row is open, the one
  // nearest the top.
  const rowIndex = Math.round(lastActivePosition);
  if (rowIndex < 0 || rowIndex >= ROW_COUNT || (!isFlat() && Math.abs(lastActivePosition - rowIndex) > 0.001)) return;
  if (rowControllers[rowIndex].nudge()) swipeNudgeCount += 1;
}

// The large logo is a one-time opening. Once the intro has run its course
// (row 0 fully open, and the logo's automatic shrink no longer moving the
// page), it's over (introOver): from then on the top of the page is row 0
// with the small logo, and the large one only comes back with a reload.
//
// On a desktop its stretch of the scroll timeline is cut out (introRemoved):
// the page gets shorter by exactly that much and the scroll position moves
// up by the same amount in the same frame, so nothing on screen moves. On a
// phone the page keeps its length and the stretch stays at the top, read as
// row 0 (see getActivePosition), with the browser's snapping taking the page
// back down to row 0 from it. Cutting it out there had Safari draw a frame
// with the gallery out of place as the scroll position jumped by more than a
// screen: every photo on screen blinked white once, just as the logo
// finished shrinking.
let introRemoved = false;
let introOver = false;
let introAutoplayRunning = false;

// How much scroll one unit of the timeline's weight takes: the pacing the
// original 980vh .stack-wrapper (style.css) gave the intro and five rows.
// The wrapper's height now follows the number of rows in the view, so every
// row keeps that same scroll distance however many there are.
const SCROLL_VH_PER_WEIGHT = 880 / (INTRO_WEIGHT + 5 * PAUSE_WEIGHT + 4 * RAMP_WEIGHT);

// Next to none on a flat phone start page (see mobileFlat), where the rows
// just scroll by: a few px, too few to feel, but the slack a scroll position
// rounded to a whole px needs to land on a row rather than just short of it.
const MOBILE_FLAT_PAUSE_WEIGHT = 0.004;

function getPauseWeight() {
  if (isFlat()) return MOBILE_FLAT_PAUSE_WEIGHT;
  return isMobile ? MOBILE_PAUSE_WEIGHT : PAUSE_WEIGHT;
}

// On a phone a finger drags the page, so a row hands over to the next in
// as much scroll as the photos themselves move (the open row's height and
// the gap below it, which the next row travels up by): the photos follow
// the finger, rather than moving at half its pace as the desktop's pacing
// had them. From the screen's width, which the browser's bars coming and
// going don't touch, so the page's length holds still under them: a
// full-width portrait photo's height (the open row's, see
// getMobileRowHeightVh) and the gap a title needs. On a flat start page
// (see mobileFlat) the gap is its own, so it's read off getRowGapVh.
function getMobileScrollPxPerWeight() {
  if (isFlat()) return (((MAX_VH + getRowGapVh()) / 100) * viewportHeightPx) / RAMP_WEIGHT;
  const fullWidthPx = document.documentElement.clientWidth - MOBILE_SIDE_PADDING_PX * 2;
  const titleGapPx = (mobileMinRowGapVh / 100) * viewportHeightPx;
  return (fullWidthPx / MOBILE_PORTRAIT_ASPECT + titleGapPx) / RAMP_WEIGHT;
}

// The whole timeline getActivePosition walks, in weight units.
function getTimelineWeight() {
  const introWeight = introRemoved ? 0 : INTRO_WEIGHT;
  return introWeight + ROW_COUNT * getPauseWeight() + (ROW_COUNT - 1) * RAMP_WEIGHT;
}

// Set again whenever the screen's measurements change (remeasureAndUpdate),
// since a phone's pacing comes from them. A project page doesn't scroll: its
// stack is the screen's height (.stack-wrapper.is-project-page in
// style.css).
function setStackHeight() {
  if (projectMode) {
    stackWrapper.style.height = "";
    return;
  }
  stackWrapper.style.height = isMobile
    ? `calc(${scrollVh(100)} + ${Math.round(getTimelineWeight() * getMobileScrollPxPerWeight())}px)`
    : scrollVh(100 + getTimelineWeight() * SCROLL_VH_PER_WEIGHT);
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
  const snapping = isMobile && introOver && !isFlat();
  if (!snapping) {
    document.documentElement.classList.remove("snap-rows");
    snapMarkers.forEach((marker) => marker.remove());
    snapMarkers = [];
    return;
  }
  // Every marker is measured, then placed, before any of them is in the
  // page, and snapping goes on last. A layout read in between can snap the
  // page to a marker that isn't in its place yet, and the browser then keeps
  // to that marker as the page's row, following it to wherever it's put.
  const wrapperTop = stackWrapper.offsetTop;
  const tops = Array.from({ length: ROW_COUNT }, (_, index) => getScrollYForPosition(index) - wrapperTop);
  while (snapMarkers.length < ROW_COUNT) {
    const marker = document.createElement("div");
    marker.className = "row-snap";
    snapMarkers.push(marker);
  }
  snapMarkers.splice(ROW_COUNT).forEach((marker) => marker.remove());
  snapMarkers.forEach((marker, index) => {
    marker.style.top = `${tops[index]}px`;
    if (!marker.isConnected) stackWrapper.appendChild(marker);
  });
  document.documentElement.classList.add("snap-rows");
}

// Returns true if it removed the intro (update() then starts over, since
// the scroll position it read no longer applies).
function maybeRemoveIntro(activePosition) {
  // Not while the page is scrolling itself to a place measured on the full
  // timeline (the intro's autoplay, or settle).
  if (introRemoved || introAutoplayRunning || settleFrame !== null || activePosition < 0) return false;
  if (isMobile && !isFlat() && introOver) return false;
  // The panels remember the scroll position they opened on and restore it
  // on close, so the timeline mustn't change under them.
  if (document.body.classList.contains("panels-open")) return false;

  // A phone keeps the stretch; only its snapping starts now. Not a flat
  // start page's (see mobileFlat), which doesn't snap, and would otherwise
  // hold row 0 still for the stretch's length at the top of the page. It's
  // cut out under the opening grid, which hides the jump (see showStart).
  if (isMobile && !isFlat()) {
    introOver = true;
    updateSnapPoints();
    return false;
  }

  introOver = true;
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
// the top of the page, which is also where a project page always is.
function getScrollYForPosition(position, pauseAt = 0.5) {
  if (position < 0 || projectMode) return 0;
  const introWeight = introRemoved ? 0 : INTRO_WEIGHT;
  const pauseWeight = getPauseWeight();
  const weight = introWeight + position * (pauseWeight + RAMP_WEIGHT) + pauseWeight * pauseAt;
  const scrollableHeight = stackWrapper.offsetHeight - window.innerHeight;
  return (weight / getTimelineWeight()) * Math.max(scrollableHeight, 0);
}

// What the Info/Index panels (panels.js) and the opening grid
// (intro-grid.js) need from the stack, and nothing more: parking it on a
// three-row frame behind the panels, showing a project's photos in the
// bottom row, opening a project, and the photos to open with.
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
  // A project hovered in the Index (panels.js): its photos in the bottom row
  // (.is-project-preview), until clearProjectPreview, so the gallery behind
  // the panel shows what's being pointed at.
  previewProject(photos) {
    const index = clamp(Math.round(lastActivePosition) + 1, 0, ROW_COUNT - 1);
    if (previewState && previewState !== rowStates[index]) gallery.clearProjectPreview();
    previewState = rowStates[index];
    previewState.override = photos;
    rows[index].classList.add("is-project-preview");
    rowControllers[index].remount();
  },
  clearProjectPreview() {
    if (!previewState) return;
    const index = rowStates.indexOf(previewState);
    previewState.override = null;
    previewState = null;
    // Gone already, if the project page has changed projects since.
    if (index < 0) return;
    rows[index].classList.remove("is-project-preview");
    rowControllers[index].remount();
  },
  // A project clicked in the Index (panels.js), projectIndex its place in
  // it: on a project page it comes into the middle (see showProject), and
  // this says so; the homepage leaves it to the link to open its page.
  openProject(projectIndex) {
    if (!projectMode) return false;
    if (projectIndex !== currentProjectIndex) showProject(projectIndex, true);
    return true;
  },
  releaseImages: releaseGalleryImages,
  releaseOpeningPhoto,
  // Resolves once the photo the gallery opens on has loaded (or failed to).
  whenOpeningPhotoLoaded() {
    return whenImageLoaded(openingImage);
  },
  // The same for every photo in the row it's in, as many as are mounted.
  whenOpeningRowLoaded() {
    const row = rows[rowStates.indexOf(openingRowState)];
    const imgs = row ? [...row.querySelectorAll(":scope > img")] : [];
    return Promise.all(imgs.map(whenImageLoaded));
  },
  // listener(risenPx, rise) on every layout of the stack, until it's
  // handed null: how far the intro has moved row 0 up from the foot of the
  // screen, in px, and how far through its rise it is, 0 to 1. The opening
  // grid goes up with it when the intro slides (INTRO_ENDING).
  followIntro(listener) {
    introListener = listener;
  },
  // Every photo in the rows showing now.
  getPhotos() {
    return rowStates.flatMap((state) => state.photos);
  },
  update,
};

// The row showing a project from the Index, see gallery.previewProject.
let previewState = null;
// See gallery.followIntro.
let introListener = null;

function whenImageLoaded(img) {
  if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  });
}

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
  // A fixed logo's rows on a phone make room for it (see
  // getMobileLogoShiftVh), which has only now been measured.
  if (isLogoFixed() && isMobile) refreshMetrics();
  setStackHeight();
  update();
  // update() leaves the fullscreen column alone — nothing about it changes
  // while fullscreen is open and the page is merely scrolling. A resize is the
  // exception, since every size it laid out came from the viewport.
  if (fullscreenRowIndex !== null) rowControllers[fullscreenRowIndex].refreshColumnLayout();
}

// Plays the logo's shrink and rise into the nav by itself, once the opening
// photo grid (intro-grid.js) has finished, or as it slides up with it
// (INTRO_ENDING), and calls gallery.playIntro. It
// scrolls the page to row 0's pause, the same place scrolling by hand gets
// to, so the logo, the first row and the titles still move in lockstep, and
// scrolling back to the top still brings the large logo back. Runs once per
// page load. Any scroll input from the visitor, or opening a panel, cancels
// it mid-way. Long enough for each of the intro's two steps to be seen.
const INTRO_AUTOPLAY_DURATION_MS = 900;
// When it slides (INTRO_ENDING), which is the one step.
const INTRO_SLIDE_DURATION_MS = 600;

// Puts the homepage on its start as it is once the intro is over, row 0 open
// and the logo in place, straight away: where the opening grid leaves it
// when it fades (INTRO_ENDING), while the gallery is still
// hidden behind the grid.
gallery.showStart = () => {
  window.scrollTo(0, getScrollYForPosition(0));
  // A jump, not the visitor scrolling (see updateTopNav).
  lastScrollY = window.scrollY;
  update();
};

gallery.playIntro = (function setUpIntroAutoplay() {
  let started = false;
  let cancelled = false;


  // The page is the visitor's from here: settle can finish the intro once
  // their scroll stops, which may well be before the next frame would have
  // let go of it.
  function cancel() {
    cancelled = true;
    introAutoplayRunning = false;
  }

  function play() {
    if (started || cancelled) return;
    started = true;

    // Eased to where row 0 is first all the way open, so the intro comes to
    // rest there rather than ending at speed, and then on to the middle of
    // its pause, where nothing moves (as settle does).
    const fromY = window.scrollY;
    const toY = getScrollYForPosition(0, 0);
    const restY = getScrollYForPosition(0);
    // Already past the intro, e.g. the browser restored a scroll position.
    if (fromY >= toY) return;

    // Holds off maybeRemoveIntro while this is still scrolling the page
    // towards a target measured on the full timeline.
    introAutoplayRunning = true;
    const startTime = performance.now();
    const durationMs = getIntroEnding() === "slide" ? INTRO_SLIDE_DURATION_MS : INTRO_AUTOPLAY_DURATION_MS;
    function tick(now) {
      if (cancelled || document.body.classList.contains("panels-open")) {
        introAutoplayRunning = false;
        return;
      }
      const t = Math.min(1, (now - startTime) / durationMs);
      window.scrollTo(0, t < 1 ? lerp(fromY, toY, easeInOut(t)) : restY);
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
  glideToPosition(target, window.scrollY, getSettleDurationMs(forward ? 1 - t : t));
}

// The glide: from fromY to where row `target` is first fully open, coming
// from fromY's side, easing in and out over durationMs, then on to the
// middle of its pause. Something else scrolling the page lets go of it.
function glideToPosition(target, fromY, durationMs) {
  const forward = target > getScrollActivePosition();
  const edgeY = getScrollYForPosition(target, forward ? 0 : 1);
  const restY = getScrollYForPosition(target);
  const startTime = performance.now();
  settleScrollY = window.scrollY;

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

// A click on a link row (see setUpRow): on a project page its project comes
// into the middle, on a start page the page scrolls on to it.
function openLinkRow(index) {
  if (projectMode) openNeighbourProject(index < projectPosition ? -1 : 1);
  else glideToRow(index);
}

// The page scrolls on to row `index` by itself, as scrolling there would
// move it, in the time a project page takes to hand over to its next project
// (HANDOVER_MS). Resting on a row, it sets off from the near end of that
// row's pause, where nothing has moved yet, so the rows move from the first
// frame.
function glideToRow(index) {
  if (fullscreenRowIndex !== null || introAutoplayRunning) return;
  stopSettle();
  const position = getScrollActivePosition();
  if (index === position) return;
  const fromY = Number.isInteger(position)
    ? getScrollYForPosition(position, index > position ? 1 : 0)
    : window.scrollY;
  glideToPosition(index, fromY, HANDOVER_MS);
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

// --- Start -------------------------------------------------------------------

// What every gallery page listens for, and its first layout.
function startStack() {
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", remeasureAndUpdate);
  // On a phone the gallery's height follows the browser's bars (dvh, see
  // style.css), which don't always come and go with a resize event.
  if (window.ResizeObserver) new ResizeObserver(remeasureAndUpdate).observe(stickyViewport);
  window.addEventListener("load", remeasureAndUpdate);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasureAndUpdate);
  }

  remeasureAndUpdate();
}

// The homepage: builds a row per entry in rowsData ({ type, category, place,
// photos }, see lib/gallery/index.js; at least one) and sets everything
// moving. Called once, by startSite in lib/gallery/index.js. With
// mobileFlat, every row on a phone stays full width (see mobileFlat above).
export function startGallery(rowsData, options = {}) {
  mobileFlat = Boolean(options.mobileFlat);
  buildRows(rowsData);
  openingRowState = rowStates[0];

  // On a phone a tap on the logo slides it away, giving the gallery its room
  // (see refreshStackFrame), rather than loading the page afresh the way the
  // link does on a desktop. Scrolling back up brings it in again, as ever.
  // Only while it slides on a phone at all (LOGO_SLIDES_ON_PHONE): a fixed
  // logo's link goes back to the start on a phone too.
  if (LOGO_SLIDES_ON_PHONE) {
    topNav.querySelector(".nav-logo-link").addEventListener("click", (event) => {
      if (!isMobile) return;
      event.preventDefault();
      logoHiddenByScroll = true;
      slideLogo(0);
    });
  }
  if (LOGO_SLIDES) window.addEventListener("pointermove", followPointerForLogo, { passive: true });
  startSettling();
  startStack();

  // Returning via back / forward: skip the intro, landing on row 0 with the
  // small logo (maybeRemoveIntro then cuts the intro out as usual).
  if (IS_HISTORY_NAVIGATION) {
    window.scrollTo(0, getScrollYForPosition(0));
    update();
  }
}

// --- Project pages -------------------------------------------------------------
// A project page (app/(site)/[slug]/page.tsx) is the homepage's stack
// standing still on three rows: the project's own large in the middle, a row
// like the homepage's, the project before it above and the one after it
// below, in the Index's order, the last one followed by the first again. The
// page doesn't scroll. A click on the row above or below (a link row, see
// setUpRow) brings its project into the middle, the
// way the homepage hands over from one row to the next as it scrolls (see
// playHandover), and the address changes to its page's, so that the
// browser's back and forward buttons go back and forth between the projects
// the same way. A phone shows just the middle row, its neighbours waiting
// off screen for a handover (see isRowNear): the Index is the way on there.

let projectMode = false;
// The projects, in the Index's order ({ title, slug, place, photos, … }, see
// sanity/fetch.ts), and which of them is in the middle.
let projectList = [];
let currentProjectIndex = 0;
// Where the stack stands (see getScrollActivePosition): on the middle row
// (1, or 0 with just the one project), except while one project hands over
// to the next.
let projectPosition = 1;
let handoverFrame = null;
// Told the project whenever another comes into the middle, see
// startProjectGallery.
let onProjectChange = () => {};
// How long a handover takes. Tunable purely by feel.
const HANDOVER_MS = 700;

function isHandingOver() {
  return handoverFrame !== null;
}

function getProjectRowData(index) {
  const project = projectList[mod(index, projectList.length)];
  return { type: "Projekt", category: project.title, place: project.place ?? "", photos: project.photos };
}

// The rows with project `index` in the middle: the one before it, it, and the
// one after it. Just it, if it's the only one.
function getProjectRowsData(index) {
  if (projectList.length === 1) return [getProjectRowData(index)];
  return [index - 1, index, index + 1].map(getProjectRowData);
}

// The middle row is a homepage row, the ones either side link to their
// projects.
function setProjectRoles() {
  rowControllers.forEach((controller, index) => {
    controller.setRole(index === projectPosition ? "stack" : "link");
  });
}

// What else changes with the project in the middle: the page's title, its
// address (as a new entry in the browser's history, unless the browser's own
// buttons brought the project here), and whoever's listening.
function setCurrentProject(index, addToHistory) {
  currentProjectIndex = index;
  const project = projectList[index];
  document.title = `${project.title} — Christina Czybik`;
  if (addToHistory) window.history.pushState(null, "", `/${project.slug}`);
  onProjectChange(project);
}

// A click on the row above (-1) or below (1) the middle one.
function openNeighbourProject(direction) {
  playHandover(direction, true);
}

// Brings the project before (direction -1) or after (1) into the middle: a
// row for the project beyond it joins at that end, the stack moves on a row,
// as the homepage's does when it's scrolled from one row to the next, and the
// row at the other end goes.
function playHandover(direction, addToHistory) {
  if (isHandingOver() || projectList.length < 2) return;
  const targetIndex = mod(currentProjectIndex + direction, projectList.length);
  rowControllers.forEach((controller) => controller.setRole("link"));
  insertRow(direction > 0 ? rows.length : 0, getProjectRowData(targetIndex + direction));
  // A row added above moves the middle one down a place.
  const from = direction > 0 ? 1 : 2;
  projectPosition = from;
  setCurrentProject(targetIndex, addToHistory);
  update();

  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / HANDOVER_MS);
    if (t < 1) {
      projectPosition = from + direction * easeInOut(t);
      update();
      handoverFrame = requestAnimationFrame(tick);
      return;
    }
    handoverFrame = null;
    removeRow(direction > 0 ? 0 : rows.length - 1);
    projectPosition = 1;
    setProjectRoles();
    update();
  }
  handoverFrame = requestAnimationFrame(tick);
}

// Changes to project `index` straight away: from the Index, which the panels
// fade back from, or by the browser's buttons, further than a neighbour.
function showProject(index, addToHistory) {
  cancelAnimationFrame(handoverFrame);
  handoverFrame = null;
  buildRows(getProjectRowsData(index));
  projectPosition = projectList.length === 1 ? 0 : 1;
  setProjectRoles();
  setCurrentProject(index, addToHistory);
  update();
}

// The browser's back and forward buttons, between the projects this page has
// shown: a neighbour hands over as it did on the way there, any other project
// comes straight in. An address that isn't one of them is loaded.
function followHistory() {
  const slug = decodeURIComponent(window.location.pathname.replace(/^\/+|\/+$/g, ""));
  const index = projectList.findIndex((project) => project.slug === slug);
  if (index < 0) {
    window.location.reload();
    return;
  }
  if (index === currentProjectIndex) return;
  const count = projectList.length;
  if (!isHandingOver() && index === mod(currentProjectIndex - 1, count)) playHandover(-1, false);
  else if (!isHandingOver() && index === mod(currentProjectIndex + 1, count)) playHandover(1, false);
  else showProject(index, false);
}

// A project page: builds its rows, with project `index` of projects in the
// middle, and sets everything moving. Called once, by startSite in
// lib/gallery/index.js. onChange is told the project in the middle, now and
// whenever another one comes in.
export function startProjectGallery(projects, index, { onChange } = {}) {
  projectMode = true;
  // No intro: the page opens on the project, with the logo in place.
  introRemoved = true;
  introOver = true;
  projectList = projects;
  onProjectChange = onChange ?? (() => {});
  buildRows(getProjectRowsData(index));
  projectPosition = projectList.length === 1 ? 0 : 1;
  openingRowState = rowStates[projectPosition];
  setProjectRoles();
  setCurrentProject(index, false);
  window.addEventListener("popstate", followHistory);
  startStack();
}

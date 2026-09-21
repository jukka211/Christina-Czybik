// Static column, no scroll-driven growth. Each row has a pool of 9 images;
// only a centered subset of that pool is actually in the DOM at a time — 1
// (the default), 3, or 5 (chosen via the bottom-center column slider) at
// rest, always all 9 on hover. The visible subset is always the pool's
// middle N, so 1 is the pool's true center image, 3 the middle 3, 5 the
// middle 5 — getVisibleIndices below still works for any count in between,
// only the slider's own range is narrowed to these three steps. Growing the
// count always expands outward from the same center, never resets the
// images.

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
  "20231209_CZY_SPD_Bundesparteitag058.JPG",
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

const ROW_COUNT = 18;
const POOL_SIZE = 9;
const NAV_GAP_PX = 48;
// Matches the width/opacity transition duration on .row img in style.css —
// an image is only actually removed from the DOM after its hide transition
// has had time to finish.
const HOVER_TRANSITION_MS = 350;

const ALL_INDICES = Array.from({ length: POOL_SIZE }, (_, i) => i);

const topNav = document.getElementById("topNav");
const column = document.getElementById("column");
const colSlider = document.getElementById("colSlider");

let defaultCount = 1;

function shuffled(list) {
  const result = list.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createImg(fileName) {
  const img = document.createElement("img");
  img.src = `../images/${encodeURIComponent(fileName)}`;
  img.alt = "";
  return img;
}

// Evenly-spaced positions across the 9-slot pool: count 5 -> 1,3,5,7,9;
// count 3 -> 1,5,9; count 9 -> all of them (0-indexed here, so one less than
// those). count 1 is a special case (the spacing formula divides by
// count - 1) — it's just the pool's true center image, position 5 of 9.
function getVisibleIndices(count) {
  if (count <= 1) return [Math.floor(POOL_SIZE / 2)];
  if (count >= POOL_SIZE) return ALL_INDICES;

  const step = (POOL_SIZE - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(i * step));
}

// Only a subset of a row's 9-image pool is ever actually in the DOM.
// .row stays justify-content: space-between always (in CSS) — the one
// exception is exactly 1 visible image, where space-between would just
// left-align it instead of centering it, so sync() toggles a "single-img"
// class for that case. Elements are created once and reused; sync() only
// ever inserts/removes them relative to whatever else is currently
// attached — an index already attached is left completely alone (not
// re-inserted, not repositioned), so hovering only ever brings in the
// currently-hidden images, never touches the ones already showing.
function setUpRow(row, els) {
  const attached = new Set();
  const hideTimeouts = new Map();
  let hovered = false;

  function findAnchor(index) {
    for (let i = index + 1; i < els.length; i += 1) {
      if (attached.has(i)) return els[i];
    }
    return null;
  }

  function sync(targetIndices) {
    const targetSet = new Set(targetIndices);
    row.classList.toggle("single-img", targetSet.size === 1);

    targetSet.forEach((index) => {
      const pendingHide = hideTimeouts.get(index);
      if (pendingHide !== undefined) {
        clearTimeout(pendingHide);
        hideTimeouts.delete(index);
      }

      if (attached.has(index)) {
        els[index].classList.add("visible");
        return;
      }

      const el = els[index];
      const anchor = findAnchor(index);
      if (anchor) row.insertBefore(el, anchor);
      else row.appendChild(el);
      attached.add(index);

      // Force layout so the browser registers the width: 0 starting state
      // before switching to "visible" on the next frame — without this the
      // insert and the class change collapse into one paint and there's
      // nothing to transition from.
      void row.offsetWidth;
      requestAnimationFrame(() => el.classList.add("visible"));
    });

    attached.forEach((index) => {
      if (targetSet.has(index) || hideTimeouts.has(index)) return;

      const el = els[index];
      el.classList.remove("visible");
      const timeoutId = window.setTimeout(() => {
        el.remove();
        attached.delete(index);
        hideTimeouts.delete(index);
      }, HOVER_TRANSITION_MS);
      hideTimeouts.set(index, timeoutId);
    });
  }

  row.addEventListener("mouseenter", () => {
    hovered = true;
    sync(ALL_INDICES);
  });
  row.addEventListener("mouseleave", () => {
    hovered = false;
    sync(getVisibleIndices(defaultCount));
  });

  return {
    applyDefaultCount() {
      if (!hovered) sync(getVisibleIndices(defaultCount));
    },
  };
}

const rowControllers = [];

for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
  const row = document.createElement("div");
  row.className = "row";

  const pool = shuffled(IMAGE_FILES).slice(0, POOL_SIZE);
  const els = pool.map((fileName) => createImg(fileName));

  const controller = setUpRow(row, els);
  rowControllers.push(controller);
  controller.applyDefaultCount();

  column.appendChild(row);
}

function setDefaultCount(count) {
  defaultCount = count;
  rowControllers.forEach((controller) => controller.applyDefaultCount());
}

colSlider.addEventListener("input", () => {
  setDefaultCount(Number(colSlider.value));
});

// The nav's height isn't a fixed number — the logo scales with viewport
// width — so it's measured for real and reserved as top padding, keeping
// rows clear of the fixed nav instead of rendering underneath it.
function applyNavOffset() {
  column.style.paddingTop = `${topNav.offsetHeight + NAV_GAP_PX}px`;
}

window.addEventListener("load", applyNavOffset);
window.addEventListener("resize", applyNavOffset);
applyNavOffset();

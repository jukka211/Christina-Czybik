// Hover-triggered per-letter animation for the inline nav logo SVG (see
// logo-animation-centered-demo.html for the original standalone version
// this is ported from, minus the direction — see below). Each
// <path class="letter" data-dx="..."> is offset horizontally by its own dx
// at full progress; the logo starts already spread out to that offset (rest
// = progress 1), hovering eases every letter to converge (progress 0), and
// mouseleave eases it back out to spread apart again, driven by one shared
// 0..1 progress value.
//
// This drives the letters via JS transforms rather than the indefinite
// auto-loop <animateTransform> baked into logo-animated-centered.svg,
// because a hover trigger needs to ease from wherever the animation
// currently sits (e.g. re-entering mid-way out) — native SMIL's
// play/pause doesn't have a clean way to reverse or retarget an
// in-progress loop like that, whereas driving a single progress value with
// requestAnimationFrame does.
//
// Shared by every page instead of duplicated per page (unlike the inline
// SVG markup itself, which is duplicated — same static-multi-page pattern
// already used for the top-nav markup) — one <script src="logo-animation.js">
// (or "../logo-animation.js" from index-page/) finds whichever #navLogo
// exists on the current page.
(function () {
  const logo = document.getElementById("navLogo");
  if (!logo) return;

  const letters = Array.from(logo.querySelectorAll(".letter")).map((el) => ({
    el,
    dx: Number(el.dataset.dx),
  }));

  const DURATION_MS = 300;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let progress = 1;
  let target = 1;
  let from = 1;
  let start = 0;
  let raf = null;

  function draw(p) {
    letters.forEach(({ el, dx }) => {
      el.setAttribute("transform", `translate(${dx * p} 0)`);
    });
  }

  // Starts already spread out (progress 1) — mouseenter eases in to 0
  // (converged) and mouseleave eases back out to 1, the reverse of the
  // original demo's rest-then-spread-on-hover direction.
  draw(progress);

  function animateTo(next) {
    target = next;
    if (raf) cancelAnimationFrame(raf);
    from = progress;
    start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      progress = from + (target - from) * ease(t);
      draw(progress);
      raf = t < 1 ? requestAnimationFrame(tick) : null;
    }

    raf = requestAnimationFrame(tick);
  }

  logo.addEventListener("mouseenter", () => animateTo(0));
  logo.addEventListener("mouseleave", () => animateTo(1));
})();

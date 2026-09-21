// The bio text is one flowing box of .text-line sentences (not the earlier
// 3-paragraph split). Each line starts narrow (20vw) and about.js expands
// whichever line the pointer is over, plus the next WINDOW_SIZE - 1 lines,
// to 100vw — a 5-line window that slides down the text as the pointer
// moves. At a fixed font size, wider also means fewer wrapped lines, so a
// line's height shrinks as it's added to the window, with no reserved
// padding to absorb it (a shrinking line is immediately followed by its
// neighbor — no dead space).
//
// That live resizing is exactly what breaks a plain CSS :hover: browsers
// re-evaluate which element is under the pointer on every layout change,
// not just on real pointer movement — so as a line shrinks under a
// stationary cursor, the browser dispatches a real mouseleave for it (and
// a mouseenter for whatever slid underneath) with no actual mouse movement
// involved. Reacting to that flips the window back and forth forever:
// shrinking cancels the hover, which snaps back narrow (and tall), putting
// the cursor back inside, re-triggering it, which shrinks it again.
//
// It also tiles the lines edge to edge with zero gap, so *some* line's
// current box always contains any given y — there's never a "miss" to
// fall back on, so a hit/miss check alone can't tell "the layout moved"
// apart from "the pointer moved".
//
// So this ignores native mouseenter/mouseleave entirely, and gates
// recomputation on actual pointer displacement: a mousemove only updates
// the window if the pointer has traveled more than MOVE_THRESHOLD_PX since
// the last move that was acted on. Layout-only "moves" under a still
// pointer never clear that bar; a real, deliberate move down the text does
// in one step. lastX/lastY only update on moves that clear the bar, so
// many tiny sub-threshold drifts in the same direction can't silently
// accumulate into a large one either.
const WINDOW_SIZE = 5;
const MOVE_THRESHOLD_PX = 10;

const lines = Array.from(document.querySelectorAll(".text-line"));
let windowStart = null;
let lastX = null;
let lastY = null;

function setWindow(startIndex) {
  if (windowStart === startIndex) return;
  windowStart = startIndex;
  lines.forEach((line, i) => {
    const expanded = startIndex !== null && i >= startIndex && i < startIndex + WINDOW_SIZE;
    line.classList.toggle("is-expanded", expanded);
  });
}

function containsPoint(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

document.addEventListener("mousemove", (event) => {
  const { clientX, clientY } = event;
  const traveled = lastX === null ? Infinity : Math.hypot(clientX - lastX, clientY - lastY);
  if (traveled <= MOVE_THRESHOLD_PX) return;

  lastX = clientX;
  lastY = clientY;
  const hitIndex = lines.findIndex((line) => containsPoint(line.getBoundingClientRect(), clientX, clientY));
  setWindow(hitIndex === -1 ? null : hitIndex);
});

document.addEventListener("mouseleave", () => {
  lastX = null;
  lastY = null;
  setWindow(null);
});

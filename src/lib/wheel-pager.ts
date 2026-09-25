/** Wheel events closer together than this belong to the same gesture (swipe + its inertia). */
const QUIET_MS = 200;
/** A gesture must have been going on at least this long before a fresh swipe can break it. */
const MIN_GESTURE_MS = 250;
/** How much stronger than the previous event a delta must be to count as a fresh swipe. */
const RESWIPE_RATIO = 2;
/** Below this, a rising delta is still read as inertia noise rather than a fresh swipe. */
const RESWIPE_MIN_DELTA = 15;

/**
 * Turns a stream of `wheel` events into at most one page turn per gesture.
 *
 * A trackpad swipe (macOS especially) isn't one event: it's dozens, and once the finger
 * lifts the OS keeps emitting decaying "inertia" events for a second or two. A fixed
 * cooldown can't cover that without also making a plain mouse wheel sluggish, so a gesture
 * is instead considered over only once the stream goes quiet for `QUIET_MS` — however long
 * the inertia lasts. The one exception is a new swipe started while the previous one's
 * inertia is still fading: inertia only ever decays, so a delta that suddenly jumps well
 * above the previous one is a finger pushing again, and starts a new gesture.
 *
 * Returns the step for each event: `1` (forward, deltaY > 0), `-1` (backward) or `0`.
 */
export function createWheelPager() {
  let lastEventAt = Number.NEGATIVE_INFINITY;
  let lastAbs = 0;
  let gestureStartedAt = 0;
  let turned = false;

  return (deltaY: number, now: number): -1 | 0 | 1 => {
    const abs = Math.abs(deltaY);
    const quiet = now - lastEventAt > QUIET_MS;
    const reswipe =
      turned &&
      now - gestureStartedAt >= MIN_GESTURE_MS &&
      abs >= RESWIPE_MIN_DELTA &&
      abs > lastAbs * RESWIPE_RATIO;
    lastEventAt = now;
    lastAbs = abs;

    if (quiet || reswipe) {
      gestureStartedAt = now;
      turned = false;
    }
    if (turned || deltaY === 0) return 0;
    turned = true;
    return deltaY > 0 ? 1 : -1;
  };
}

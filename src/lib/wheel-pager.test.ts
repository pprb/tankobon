import { describe, expect, it } from 'vitest';

import { createWheelPager } from './wheel-pager';

/** Feeds `deltas` one every `intervalMs` starting at `start`, returns the non-zero steps. */
function feed(pager: ReturnType<typeof createWheelPager>, deltas: number[], start = 0, intervalMs = 16) {
  return deltas.map((delta, i) => pager(delta, start + i * intervalMs)).filter((step) => step !== 0);
}

/** A swipe followed by a long, decaying inertia tail (~1.5s of events). */
function swipeWithInertia(peak = 80) {
  const deltas = [10, 40, peak, peak];
  for (let d = peak; d >= 1; d *= 0.95) deltas.push(Math.round(d) || 1);
  return deltas;
}

describe('createWheelPager', () => {
  it('turns exactly one page for a trackpad swipe, inertia included', () => {
    const pager = createWheelPager();
    const deltas = swipeWithInertia();
    expect(deltas.length * 16).toBeGreaterThan(1000);
    expect(feed(pager, deltas)).toEqual([1]);
  });

  it('turns backward for negative deltas', () => {
    const pager = createWheelPager();
    expect(feed(pager, swipeWithInertia().map((d) => -d))).toEqual([-1]);
  });

  it('turns again once the wheel has gone quiet', () => {
    const pager = createWheelPager();
    expect(feed(pager, swipeWithInertia())).toEqual([1]);
    expect(feed(pager, swipeWithInertia(), 10_000)).toEqual([1]);
  });

  it('turns one page per separate mouse wheel notch', () => {
    const pager = createWheelPager();
    expect([pager(100, 0), pager(100, 300), pager(100, 600)]).toEqual([1, 1, 1]);
  });

  it('starts a new gesture when a fresh swipe interrupts fading inertia', () => {
    const pager = createWheelPager();
    const first = [10, 40, 80, 80, 60, 40, 25, 15, 10, 8, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2];
    const second = [30, 80, 80, 60];
    expect(feed(pager, [...first, ...second])).toEqual([1, 1]);
  });

  it('does not mistake inertia noise for a fresh swipe', () => {
    const pager = createWheelPager();
    expect(feed(pager, [10, 40, 80, 60, 40, 20, 10, 5, 3, 1, 3, 1, 2, 6, 2, 1, 1])).toEqual([1]);
  });
});

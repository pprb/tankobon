import { describe, expect, it } from 'vitest';

import { createReadingTimeAccumulator } from './reading-time';

describe('createReadingTimeAccumulator', () => {
  it('sends a batch once enough active time is gathered', () => {
    const sent: number[] = [];
    const accumulator = createReadingTimeAccumulator((seconds) => sent.push(seconds), 15);
    accumulator.tick(true, 5);
    accumulator.tick(true, 5);
    expect(sent).toEqual([]);
    accumulator.tick(true, 5);
    expect(sent).toEqual([15]);
  });

  it('ignores inactive ticks', () => {
    const sent: number[] = [];
    const accumulator = createReadingTimeAccumulator((seconds) => sent.push(seconds), 10);
    accumulator.tick(false, 5);
    accumulator.tick(false, 5);
    accumulator.flush();
    expect(sent).toEqual([]);
  });

  it('flushes what is pending, once', () => {
    const sent: number[] = [];
    const accumulator = createReadingTimeAccumulator((seconds) => sent.push(seconds), 60);
    accumulator.tick(true, 5);
    accumulator.flush();
    accumulator.flush();
    expect(sent).toEqual([5]);
  });
});

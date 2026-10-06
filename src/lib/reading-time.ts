/**
 * Accumulation of the time spent reading, reported to the main process in batches.
 * @module
 */

/** Collects reading seconds and hands them over in batches. */
export interface ReadingTimeAccumulator {
  /** Adds `seconds` when `active` (the book is open and the window in use); sends the batch once it is long enough. */
  tick(active: boolean, seconds: number): void;
  /** Sends what is pending, however short (the reader is closing or the window was hidden). */
  flush(): void;
}

/** Seconds gathered before a batch is sent, so the main process isn't called every few seconds. */
export const FLUSH_AFTER_SECONDS = 60;

/** Builds an accumulator that calls `send` with whole seconds, never more than `FLUSH_AFTER_SECONDS` plus one tick. */
export function createReadingTimeAccumulator(
  send: (seconds: number) => void,
  flushAfter = FLUSH_AFTER_SECONDS,
): ReadingTimeAccumulator {
  let pending = 0;
  const flush = () => {
    const seconds = Math.round(pending);
    pending = 0;
    if (seconds > 0) send(seconds);
  };
  return {
    tick(active, seconds) {
      if (!active) return;
      pending += seconds;
      if (pending >= flushAfter) flush();
    },
    flush,
  };
}

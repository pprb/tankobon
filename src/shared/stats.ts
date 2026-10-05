/**
 * Reading statistics shared between the main process and the renderer (via preload).
 * @module
 */

/** Time spent reading on one local calendar day. */
export interface ReadingDay {
  /** Local date, `YYYY-MM-DD`. */
  day: string;
  /** Seconds spent with a book open and the window in use that day, all books together. */
  seconds: number;
}

/**
 * The history behind the statistics page: the raw material the renderer groups by month or year.
 * Only books finished and time spent after statistics were introduced are recorded.
 */
export interface ReadingStats {
  /** ISO timestamps at which a book was first finished (last page reached, or tagged `Lu`), oldest first. */
  finished: string[];
  /** Reading time per day, oldest first. */
  days: ReadingDay[];
}

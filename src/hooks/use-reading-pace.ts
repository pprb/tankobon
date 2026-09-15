import { useState } from 'react';

export interface ReadingPace {
  /** Percentage of the book read so far (0-100), based on the current page. */
  percent: number;
  /** Estimated minutes left to finish, from this session's pace so far; null until there's enough data. */
  remainingMinutes: number | null;
}

interface Session {
  key: string;
  startTime: number;
  startPage: number;
}

// Below this, a pace estimate is too noisy to be worth showing (right after opening a book).
const MIN_ELAPSED_MINUTES = 0.1;

/**
 * Tracks how fast the current page advances (pages per minute) since `sessionKey` last changed,
 * and estimates the time left to reach the last page at that pace. `sessionKey` should be a value
 * that changes exactly when a new book (or a new reading session for one) starts, e.g. the opened
 * archive's id — that resets the pace tracking, following React's "adjust state while rendering"
 * pattern rather than an effect, so the very first render already reflects the new session.
 */
export function useReadingPace(sessionKey: string | undefined, pageCount: number, currentPage: number): ReadingPace {
  const [session, setSession] = useState<Session | null>(null);

  if (sessionKey !== session?.key) {
    setSession(sessionKey ? { key: sessionKey, startTime: Date.now(), startPage: currentPage } : null);
  }

  const percent = pageCount > 0 ? ((currentPage + 1) / pageCount) * 100 : 0;

  let remainingMinutes: number | null = null;
  if (session && session.key === sessionKey) {
    const remainingPages = pageCount - 1 - currentPage;
    const pagesRead = currentPage - session.startPage;
    const elapsedMinutes = (Date.now() - session.startTime) / 60000;
    if (remainingPages > 0 && pagesRead > 0 && elapsedMinutes >= MIN_ELAPSED_MINUTES) {
      const pagesPerMinute = pagesRead / elapsedMinutes;
      remainingMinutes = remainingPages / pagesPerMinute;
    }
  }

  return { percent, remainingMinutes };
}

/** e.g. 45 -> "45 min", 90 -> "1 h 30 min", 120 -> "2 h". */
export function formatRemainingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

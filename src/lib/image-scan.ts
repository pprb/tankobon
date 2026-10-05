/**
 * Pure helpers for the background measure of the pages' sizes: the progress bar's fill and the
 * library row's "average size" text.
 * @module
 */
import type { ImageScanProgress, LibraryEntry } from '@/shared/library';

/** How full the progress bar is, as a whole percentage from 0 to 100 (0 while the total is unknown). */
export function imageScanPercent(progress: Pick<ImageScanProgress, 'processed' | 'total'>): number {
  if (!(progress.total > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((progress.processed / progress.total) * 100)));
}

/** The book's average page size as "1 200 × 1 800 px", or null until the background scan has measured it. */
export function formatPageSize(entry: Pick<LibraryEntry, 'avgPageWidth' | 'avgPageHeight'>, locale?: string): string | null {
  if (entry.avgPageWidth === null || entry.avgPageHeight === null) return null;
  const format = new Intl.NumberFormat(locale);
  return `${format.format(entry.avgPageWidth)} × ${format.format(entry.avgPageHeight)} px`;
}

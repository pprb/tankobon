// Comic archive abstraction. Each format (CBZ, CBR, PDF) implements `ComicArchive`;
// the rest of the app only deals with page indexes.
import path from 'node:path';

import type { ComicPage } from '../../shared/comic';

export interface ComicArchive {
  readonly path: string;
  /** Image entry names, sorted in reading order. */
  readonly pages: readonly string[];
  /** Total entries in the archive (not just image pages). */
  readonly fileCount: number;
  readPage(index: number): Promise<ComicPage>;
  close(): Promise<void>;
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
};

export function imageMimeType(entryName: string): string | undefined {
  return IMAGE_MIME_TYPES[path.extname(entryName).toLowerCase()];
}

/** Hidden files and macOS resource forks (`__MACOSX/._page.jpg`) are not pages. */
export function isPageEntry(entryName: string): boolean {
  const base = path.posix.basename(entryName);
  return !base.startsWith('.') && !entryName.startsWith('__MACOSX/') && imageMimeType(entryName) !== undefined;
}

/** Natural sort so `page2.jpg` comes before `page10.jpg`. */
export function sortPages(entryNames: string[]): string[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...entryNames].sort(collator.compare);
}

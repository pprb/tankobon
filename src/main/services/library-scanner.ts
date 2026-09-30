// Walks a directory tree for comics and registers everything it finds in the library.
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { SUPPORTED_COMIC_EXTENSIONS } from '../../shared/comic';
import type { ScanProgress } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { openArchive } from './comic-service';

export interface ScanSummary {
  added: number;
  skipped: number;
  failed: number;
  total: number;
}

export function isSupportedComicFile(fileName: string): boolean {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  return (SUPPORTED_COMIC_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Every supported comic under `directory`, recursively, sorted so a scan walks a series in a
 * predictable order. Directories that can't be read (permissions, a disconnected network share)
 * are skipped rather than failing the whole scan. Symlinks are never followed: `isDirectory()` is
 * false for them, which also rules out cycles.
 */
export async function collectComicFiles(directory: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && isSupportedComicFile(entry.name)) {
        found.push(fullPath);
      }
    }
  }

  await walk(directory);
  return found;
}

/**
 * Adds every comic under `directory` to the library. Each file has to be opened to learn its page
 * count — that's the slow part, and why `onProgress` reports file by file. Files already in the
 * library are skipped without being opened, and one unreadable file only costs itself (`failed`),
 * never the rest of the scan.
 */
export async function scanIntoLibrary(
  repo: LibraryRepository,
  directory: string,
  onProgress: (progress: ScanProgress) => void,
): Promise<ScanSummary> {
  onProgress({ phase: 'scanning', processed: 0, total: 0, currentFile: directory });
  const files = await collectComicFiles(directory);

  const summary: ScanSummary = { added: 0, skipped: 0, failed: 0, total: files.length };

  for (const [index, filePath] of files.entries()) {
    onProgress({ phase: 'importing', processed: index, total: files.length, currentFile: filePath });

    if (repo.hasPath(filePath)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const archive = await openArchive(filePath);
      try {
        const { size } = await stat(filePath);
        const title = path.basename(filePath, path.extname(filePath));
        repo.register(filePath, title, archive.pages.length, archive.fileCount, size);
        summary.added += 1;
      } finally {
        await archive.close();
      }
    } catch {
      summary.failed += 1;
    }
  }

  onProgress({ phase: 'done', processed: files.length, total: files.length, currentFile: '' });
  return summary;
}

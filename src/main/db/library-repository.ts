import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import type { LibraryEntry } from '../../shared/library';

interface LibraryRow {
  id: string;
  path: string;
  title: string;
  page_count: number;
  current_page: number;
  added_at: string;
  last_opened_at: string;
  file_count: number;
  file_size: number;
  rating: number;
  tags: string;
}

function fromRow(row: LibraryRow): LibraryEntry {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    pageCount: row.page_count,
    currentPage: row.current_page,
    addedAt: row.added_at,
    lastOpenedAt: row.last_opened_at,
    fileCount: row.file_count,
    fileSize: row.file_size,
    rating: row.rating,
    tags: JSON.parse(row.tags) as string[],
  };
}

/** Persists the comic library (one row per known file) to the local database. */
export class LibraryRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(): LibraryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM library ORDER BY last_opened_at DESC')
      .all() as unknown as LibraryRow[];
    return rows.map(fromRow);
  }

  /**
   * Registers a comic as just opened: creates it on first open, else refreshes its metadata.
   * Never touches `rating`/`tags`, which are only ever set by the user.
   */
  touch(filePath: string, title: string, pageCount: number, fileCount: number, fileSize: number): LibraryEntry {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT * FROM library WHERE path = ?').get(filePath) as
      | LibraryRow
      | undefined;

    if (existing) {
      const currentPage = Math.min(existing.current_page, pageCount - 1);
      this.db
        .prepare(
          `UPDATE library
           SET title = ?, page_count = ?, current_page = ?, file_count = ?, file_size = ?, last_opened_at = ?
           WHERE id = ?`,
        )
        .run(title, pageCount, currentPage, fileCount, fileSize, now, existing.id);
      return fromRow({
        ...existing,
        title,
        page_count: pageCount,
        current_page: currentPage,
        file_count: fileCount,
        file_size: fileSize,
        last_opened_at: now,
      });
    }

    const row: LibraryRow = {
      id: randomUUID(),
      path: filePath,
      title,
      page_count: pageCount,
      current_page: 0,
      added_at: now,
      last_opened_at: now,
      file_count: fileCount,
      file_size: fileSize,
      rating: 0,
      tags: '[]',
    };
    this.db
      .prepare(
        `INSERT INTO library
           (id, path, title, page_count, current_page, added_at, last_opened_at, file_count, file_size, rating, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.path,
        row.title,
        row.page_count,
        row.current_page,
        row.added_at,
        row.last_opened_at,
        row.file_count,
        row.file_size,
        row.rating,
        row.tags,
      );
    return fromRow(row);
  }

  /** Whether a file is already in the library, so a folder scan can skip it without opening it. */
  hasPath(filePath: string): boolean {
    return this.db.prepare('SELECT 1 FROM library WHERE path = ?').get(filePath) !== undefined;
  }

  /**
   * Adds a comic discovered by a folder scan. Unlike `touch`, an entry that already exists is left
   * completely alone — a scan is not a read, so it must not bump `last_opened_at` or refresh
   * metadata behind the user's back. New rows get `last_opened_at = added_at`, which is what puts
   * a freshly scanned batch at the top of the library list.
   */
  register(
    filePath: string,
    title: string,
    pageCount: number,
    fileCount: number,
    fileSize: number,
  ): 'created' | 'existing' {
    if (this.hasPath(filePath)) {
      return 'existing';
    }
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO library
           (id, path, title, page_count, current_page, added_at, last_opened_at, file_count, file_size, rating, tags)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0, '[]')`,
      )
      .run(randomUUID(), filePath, title, pageCount, now, now, fileCount, fileSize);
    return 'created';
  }

  /**
   * Writes a whole entry, matching an existing one by its file path (paths are unique, ids are
   * not stable across machines) — used by the JSON import to restore a snapshot on top of the
   * current library. Unlike `touch`, this does overwrite `rating`/`tags`: they're part of what
   * the user is restoring.
   */
  upsert(entry: LibraryEntry): 'created' | 'updated' {
    const existing = this.db.prepare('SELECT id FROM library WHERE path = ?').get(entry.path) as
      | { id: string }
      | undefined;

    if (existing) {
      this.db
        .prepare(
          `UPDATE library
           SET title = ?, page_count = ?, current_page = ?, added_at = ?, last_opened_at = ?,
               file_count = ?, file_size = ?, rating = ?, tags = ?
           WHERE id = ?`,
        )
        .run(
          entry.title,
          entry.pageCount,
          entry.currentPage,
          entry.addedAt,
          entry.lastOpenedAt,
          entry.fileCount,
          entry.fileSize,
          entry.rating,
          JSON.stringify(entry.tags),
          existing.id,
        );
      return 'updated';
    }

    this.db
      .prepare(
        `INSERT INTO library
           (id, path, title, page_count, current_page, added_at, last_opened_at, file_count, file_size, rating, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        // A fresh id when the snapshot's one is already taken by a different file.
        this.idIsTaken(entry.id) ? randomUUID() : entry.id,
        entry.path,
        entry.title,
        entry.pageCount,
        entry.currentPage,
        entry.addedAt,
        entry.lastOpenedAt,
        entry.fileCount,
        entry.fileSize,
        entry.rating,
        JSON.stringify(entry.tags),
      );
    return 'created';
  }

  private idIsTaken(id: string): boolean {
    return this.db.prepare('SELECT 1 FROM library WHERE id = ?').get(id) !== undefined;
  }

  /**
   * Path of the most recently opened comic, if any. Used to reopen the file dialog in the
   * directory the user last picked a book from, rather than the OS default.
   */
  lastOpenedPath(): string | null {
    const row = this.db
      .prepare('SELECT path FROM library ORDER BY last_opened_at DESC LIMIT 1')
      .get() as { path: string } | undefined;
    return row?.path ?? null;
  }

  updateProgress(id: string, currentPage: number): void {
    this.db.prepare('UPDATE library SET current_page = ? WHERE id = ?').run(currentPage, id);
  }

  updateRating(id: string, rating: number): void {
    this.db.prepare('UPDATE library SET rating = ? WHERE id = ?').run(rating, id);
  }

  updateTags(id: string, tags: string[]): void {
    this.db.prepare('UPDATE library SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM library WHERE id = ?').run(id);
  }
}

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

  /** Registers a comic as just opened: creates it on first open, else refreshes its metadata. */
  touch(filePath: string, title: string, pageCount: number): LibraryEntry {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT * FROM library WHERE path = ?').get(filePath) as
      | LibraryRow
      | undefined;

    if (existing) {
      const currentPage = Math.min(existing.current_page, pageCount - 1);
      this.db
        .prepare(
          'UPDATE library SET title = ?, page_count = ?, current_page = ?, last_opened_at = ? WHERE id = ?',
        )
        .run(title, pageCount, currentPage, now, existing.id);
      return fromRow({ ...existing, title, page_count: pageCount, current_page: currentPage, last_opened_at: now });
    }

    const row: LibraryRow = {
      id: randomUUID(),
      path: filePath,
      title,
      page_count: pageCount,
      current_page: 0,
      added_at: now,
      last_opened_at: now,
    };
    this.db
      .prepare(
        `INSERT INTO library (id, path, title, page_count, current_page, added_at, last_opened_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(row.id, row.path, row.title, row.page_count, row.current_page, row.added_at, row.last_opened_at);
    return fromRow(row);
  }

  updateProgress(id: string, currentPage: number): void {
    this.db.prepare('UPDATE library SET current_page = ? WHERE id = ?').run(currentPage, id);
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM library WHERE id = ?').run(id);
  }
}

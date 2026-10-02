/**
 * Persistence of the reading lists (the `reading_lists` and `reading_list_items` tables).
 * @module
 */
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import { MAX_READING_LIST_SIZE, type ReadingList, type ReadingListResult } from '../../shared/reading-list';

interface ReadingListRow {
  id: string;
  name: string;
  created_at: string;
}

const NOT_FOUND: ReadingListResult = { status: 'error', message: 'Liste de lecture introuvable.' };

/**
 * Persists the reading lists: named, ordered piles of library entries. Changes that can be
 * refused (full list, empty name, unknown list) resolve to a `ReadingListResult` error.
 */
export class ReadingListRepository {
  constructor(private readonly db: DatabaseSync) {}

  /** Every list, oldest first. */
  list(): ReadingList[] {
    const rows = this.db
      .prepare('SELECT * FROM reading_lists ORDER BY created_at, name')
      .all() as unknown as ReadingListRow[];
    const items = new Map<string, string[]>();
    const itemRows = this.db
      .prepare('SELECT list_id, library_id FROM reading_list_items ORDER BY list_id, position')
      .all() as unknown as { list_id: string; library_id: string }[];
    for (const row of itemRows) {
      const ids = items.get(row.list_id) ?? [];
      ids.push(row.library_id);
      items.set(row.list_id, ids);
    }
    return rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at, entryIds: items.get(row.id) ?? [] }));
  }

  /** One list by id, or null if it doesn't exist (anymore). */
  get(id: string): ReadingList | null {
    const row = this.db.prepare('SELECT * FROM reading_lists WHERE id = ?').get(id) as ReadingListRow | undefined;
    return row ? { id: row.id, name: row.name, createdAt: row.created_at, entryIds: this.entryIdsOf(id) } : null;
  }

  private entryIdsOf(id: string): string[] {
    const rows = this.db
      .prepare('SELECT library_id FROM reading_list_items WHERE list_id = ? ORDER BY position')
      .all(id) as unknown as { library_id: string }[];
    return rows.map((row) => row.library_id);
  }

  private ok(id: string): ReadingListResult {
    const list = this.get(id);
    return list ? { status: 'ok', list } : NOT_FOUND;
  }

  /** Creates an empty list. The name is trimmed and must not be empty. */
  create(name: string): ReadingListResult {
    const trimmed = name.trim();
    if (trimmed === '') {
      return { status: 'error', message: 'Le nom de la liste ne peut pas être vide.' };
    }
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO reading_lists (id, name, created_at) VALUES (?, ?, ?)')
      .run(id, trimmed, new Date().toISOString());
    return this.ok(id);
  }

  /** Renames a list. The name is trimmed and must not be empty. */
  rename(id: string, name: string): ReadingListResult {
    const trimmed = name.trim();
    if (trimmed === '') {
      return { status: 'error', message: 'Le nom de la liste ne peut pas être vide.' };
    }
    this.db.prepare('UPDATE reading_lists SET name = ? WHERE id = ?').run(trimmed, id);
    return this.ok(id);
  }

  /** Deletes a list; the books it held stay in the library. */
  remove(id: string): void {
    this.db.prepare('DELETE FROM reading_list_items WHERE list_id = ?').run(id);
    this.db.prepare('DELETE FROM reading_lists WHERE id = ?').run(id);
  }

  /**
   * Puts a library entry at the end of a list. A book already in the list stays where it is;
   * a list already holding `MAX_READING_LIST_SIZE` books refuses new ones.
   */
  addEntry(id: string, libraryId: string): ReadingListResult {
    const list = this.get(id);
    if (!list) {
      return NOT_FOUND;
    }
    if (list.entryIds.includes(libraryId)) {
      return { status: 'ok', list };
    }
    if (list.entryIds.length >= MAX_READING_LIST_SIZE) {
      return {
        status: 'error',
        message: `La liste « ${list.name} » est pleine (${MAX_READING_LIST_SIZE} livres au maximum).`,
      };
    }
    if (this.db.prepare('SELECT 1 FROM library WHERE id = ?').get(libraryId) === undefined) {
      return { status: 'error', message: "Ce livre n'est plus dans la bibliothèque." };
    }
    // After the last position rather than at `length`: removing a book from the library leaves a gap.
    this.db
      .prepare(
        `INSERT INTO reading_list_items (list_id, library_id, position)
         SELECT ?, ?, COALESCE(MAX(position) + 1, 0) FROM reading_list_items WHERE list_id = ?`,
      )
      .run(id, libraryId, id);
    return this.ok(id);
  }

  /** Takes a library entry out of a list; the book stays in the library. */
  removeEntry(id: string, libraryId: string): ReadingListResult {
    if (!this.get(id)) {
      return NOT_FOUND;
    }
    this.db.prepare('DELETE FROM reading_list_items WHERE list_id = ? AND library_id = ?').run(id, libraryId);
    this.writePositions(id, this.entryIdsOf(id));
    return this.ok(id);
  }

  /**
   * Stores a new order for a list. `entryIds` must hold exactly the list's current entries: a
   * stale order (the list changed in the meantime) is refused rather than dropping or adding books.
   * Which books may move (not the finished ones) is the renderer's rule, see `moveUnfinished()`.
   */
  reorder(id: string, entryIds: string[]): ReadingListResult {
    const list = this.get(id);
    if (!list) {
      return NOT_FOUND;
    }
    const current = new Set(list.entryIds);
    if (entryIds.length !== current.size || new Set(entryIds).size !== current.size || !entryIds.every((e) => current.has(e))) {
      return { status: 'error', message: 'La liste a changé entre-temps : réessaie.' };
    }
    this.writePositions(id, entryIds);
    return this.ok(id);
  }

  /**
   * Writes a whole list, matching an existing one by id (list ids are random UUIDs, so unlike
   * library ids they identify the same list across machines) — used by the JSON import. The
   * snapshot wins: name and entries are replaced. Entries beyond `MAX_READING_LIST_SIZE` are dropped.
   */
  upsert(list: ReadingList): 'created' | 'updated' {
    const exists = this.db.prepare('SELECT 1 FROM reading_lists WHERE id = ?').get(list.id) !== undefined;
    if (exists) {
      this.db.prepare('UPDATE reading_lists SET name = ?, created_at = ? WHERE id = ?').run(list.name, list.createdAt, list.id);
    } else {
      this.db
        .prepare('INSERT INTO reading_lists (id, name, created_at) VALUES (?, ?, ?)')
        .run(list.id, list.name, list.createdAt);
    }
    this.db.prepare('DELETE FROM reading_list_items WHERE list_id = ?').run(list.id);
    this.writePositions(list.id, [...new Set(list.entryIds)].slice(0, MAX_READING_LIST_SIZE));
    return exists ? 'updated' : 'created';
  }

  private writePositions(id: string, entryIds: string[]): void {
    const write = this.db.prepare(
      'INSERT OR REPLACE INTO reading_list_items (list_id, library_id, position) VALUES (?, ?, ?)',
    );
    entryIds.forEach((libraryId, position) => write.run(id, libraryId, position));
  }
}

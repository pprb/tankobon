/**
 * The SQLite schema and its in-place migrations. Kept apart from database.ts, which imports
 * `electron`, so that the repository tests can build their `:memory:` databases with the very
 * same `migrate()` the app runs at startup instead of a hand-maintained copy of the tables.
 * @module
 */
import type { DatabaseSync } from 'node:sqlite';

/**
 * Brings `db` up to the current schema: creates the tables that don't exist yet, then adds the
 * columns introduced after the initial release. Idempotent, and never destructive, so it runs on
 * every start against fresh and existing databases alike.
 */
export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      page_count INTEGER NOT NULL,
      current_page INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      last_opened_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL COLLATE NOCASE DEFAULT '',
      last_name TEXT NOT NULL COLLATE NOCASE,
      nationality TEXT,
      UNIQUE (first_name, last_name)
    );

    CREATE TABLE IF NOT EXISTS credits (
      library_id TEXT NOT NULL REFERENCES library (id) ON DELETE CASCADE,
      person_id TEXT NOT NULL REFERENCES people (id),
      role TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (library_id, person_id, role)
    );

    CREATE TABLE IF NOT EXISTS reading_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reading_list_items (
      list_id TEXT NOT NULL REFERENCES reading_lists (id) ON DELETE CASCADE,
      library_id TEXT NOT NULL REFERENCES library (id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (list_id, library_id)
    );
  `);

  // Columns added after the initial release: existing databases need them backfilled.
  addColumnIfMissing(db, 'library', 'file_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'file_size', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'rating', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'tags', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, 'library', 'title_locked', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'series', 'TEXT');
  addColumnIfMissing(db, 'library', 'volume', 'TEXT');
  addColumnIfMissing(db, 'library', 'release_date', 'TEXT');
  addColumnIfMissing(db, 'library', 'language', 'TEXT');
  // Existing lists all get 0: `list()` then falls back to their creation order, as before.
  addColumnIfMissing(db, 'reading_lists', 'position', 'INTEGER NOT NULL DEFAULT 0');
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

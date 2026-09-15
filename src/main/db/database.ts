// Local, file-based storage: a single SQLite database in the user data
// directory (never in the cloud, never in Chromium's storage). Uses Node's
// built-in `node:sqlite` module, so no native module needs to be compiled or
// shipped alongside Electron.
import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_FILE_NAME = 'tankobon.db';

export function openDatabase(): DatabaseSync {
  const dir = app.getPath('userData');
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, DB_FILE_NAME));
  migrate(db);
  return db;
}

function migrate(db: DatabaseSync): void {
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
  `);

  // Columns added after the initial release: existing databases need them backfilled.
  addColumnIfMissing(db, 'library', 'file_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'file_size', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'rating', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'library', 'tags', "TEXT NOT NULL DEFAULT '[]'");
}

function addColumnIfMissing(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

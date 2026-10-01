import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { migrate } from './schema';

function columnNames(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
}

describe('migrate', () => {
  it('creates the full schema on an empty database', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);

    expect(columnNames(db, 'library')).toEqual([
      'id',
      'path',
      'title',
      'page_count',
      'current_page',
      'added_at',
      'last_opened_at',
      'file_count',
      'file_size',
      'rating',
      'tags',
      'title_locked',
      'series',
      'volume',
      'release_date',
      'language',
    ]);
    expect(columnNames(db, 'settings')).toEqual(['key', 'value']);
    expect(columnNames(db, 'people')).toEqual(['id', 'first_name', 'last_name', 'nationality']);
    expect(columnNames(db, 'credits')).toEqual(['library_id', 'person_id', 'role', 'position']);
  });

  it('backfills the later columns on a database from the initial release, keeping its rows', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE library (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        page_count INTEGER NOT NULL,
        current_page INTEGER NOT NULL DEFAULT 0,
        added_at TEXT NOT NULL,
        last_opened_at TEXT NOT NULL
      );
      INSERT INTO library VALUES ('a', '/comics/a.cbz', 'A', 20, 5, '2024-01-01', '2024-01-02');
    `);

    migrate(db);

    expect(
      db.prepare('SELECT current_page, file_count, file_size, rating, tags, title_locked, series FROM library').get(),
    ).toEqual({
      current_page: 5,
      file_count: 0,
      file_size: 0,
      rating: 0,
      tags: '[]',
      title_locked: 0,
      series: null,
    });
    expect(columnNames(db, 'settings')).toEqual(['key', 'value']);
  });

  it('is idempotent', () => {
    const db = new DatabaseSync(':memory:');
    migrate(db);
    db.exec("INSERT INTO settings VALUES ('theme', '\"dark\"')");

    expect(() => migrate(db)).not.toThrow();
    expect(columnNames(db, 'library')).toHaveLength(16);
    expect(db.prepare('SELECT value FROM settings').get()).toEqual({ value: '"dark"' });
  });
});

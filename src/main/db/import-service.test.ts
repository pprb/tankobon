import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../shared/settings';
import { buildExport } from './export-service';
import { applyImport, parseExport } from './import-service';
import { LibraryRepository } from './library-repository';
import { SettingsRepository } from './settings-repository';

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE library (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      page_count INTEGER NOT NULL,
      current_page INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL,
      last_opened_at TEXT NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 0,
      file_size INTEGER NOT NULL DEFAULT 0,
      rating INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

describe('parseExport', () => {
  it('rejects a file that is not JSON', () => {
    expect(() => parseExport('not json')).toThrow(/JSON valide/);
  });

  it('rejects JSON that is not a Tankobon export', () => {
    expect(() => parseExport('{"hello":"world"}')).toThrow(/export Tankōbon/);
    expect(() => parseExport('{"version":2,"library":[]}')).toThrow(/export Tankōbon/);
  });

  it('accepts what buildExport produces', () => {
    const db = createDatabase();
    const libraryRepo = new LibraryRepository(db);
    libraryRepo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    const raw = JSON.stringify(buildExport(libraryRepo, new SettingsRepository(db)));

    const parsed = parseExport(raw);

    expect(parsed.library).toHaveLength(1);
    expect(parsed.library[0]).toMatchObject({ path: '/comics/one.cbz', title: 'One', pageCount: 20 });
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('drops unusable entries, fills in missing fields and clamps the current page', () => {
    const parsed = parseExport(
      JSON.stringify({
        version: 1,
        library: [
          { title: 'No path' },
          { path: '/comics/two.cbz', pageCount: 10, currentPage: 99, rating: 12, tags: ['Lu', 7] },
        ],
      }),
    );

    expect(parsed.library).toHaveLength(1);
    expect(parsed.library[0]).toMatchObject({
      path: '/comics/two.cbz',
      title: '/comics/two.cbz',
      currentPage: 9,
      rating: 5,
      tags: ['Lu'],
    });
  });

  it('ignores unknown settings keys and values of the wrong type', () => {
    const parsed = parseExport(
      JSON.stringify({
        version: 1,
        library: [],
        settings: { readingDirection: 'rtl', pageSpacing: 'wide', nope: true },
      }),
    );

    expect(parsed.settings).toEqual({ ...DEFAULT_SETTINGS, readingDirection: 'rtl' });
    expect(parsed.settings).not.toHaveProperty('nope');
  });
});

describe('applyImport', () => {
  let db: DatabaseSync;
  let libraryRepo: LibraryRepository;
  let settingsRepo: SettingsRepository;

  beforeEach(() => {
    db = createDatabase();
    libraryRepo = new LibraryRepository(db);
    settingsRepo = new SettingsRepository(db);
  });

  it('adds unknown comics, overwrites known ones and leaves the rest alone', () => {
    const known = libraryRepo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    libraryRepo.updateRating(known.id, 1);
    libraryRepo.touch('/comics/local-only.cbz', 'Local', 5, 5, 10);

    const summary = applyImport(
      libraryRepo,
      settingsRepo,
      parseExport(
        JSON.stringify({
          version: 1,
          library: [
            { path: '/comics/one.cbz', title: 'One', pageCount: 20, currentPage: 7, rating: 4, tags: ['Lu'] },
            { path: '/comics/new.cbz', title: 'New', pageCount: 30 },
          ],
        }),
      ),
    );

    expect(summary).toEqual({ added: 1, updated: 1 });
    const byPath = Object.fromEntries(libraryRepo.list().map((entry) => [entry.path, entry]));
    expect(Object.keys(byPath)).toHaveLength(3);
    expect(byPath['/comics/one.cbz']).toMatchObject({ id: known.id, currentPage: 7, rating: 4, tags: ['Lu'] });
    expect(byPath['/comics/new.cbz']).toMatchObject({ title: 'New', pageCount: 30 });
    expect(byPath['/comics/local-only.cbz']).toMatchObject({ title: 'Local' });
  });

  it('replaces the stored settings', () => {
    settingsRepo.set('readingMode', 'continuous');

    applyImport(
      libraryRepo,
      settingsRepo,
      parseExport(JSON.stringify({ version: 1, library: [], settings: { readerBackground: '#ffffff' } })),
    );

    expect(settingsRepo.getAll()).toEqual({ ...DEFAULT_SETTINGS, readerBackground: '#ffffff' });
  });
});

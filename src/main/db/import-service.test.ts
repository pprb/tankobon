import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../shared/settings';
import { buildExport } from './export-service';
import { applyImport, parseExport } from './import-service';
import { LibraryRepository } from './library-repository';
import { ReadingListRepository } from './reading-list-repository';
import { migrate } from './schema';
import { SettingsRepository } from './settings-repository';

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  migrate(db);
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
    const raw = JSON.stringify(buildExport(libraryRepo, new SettingsRepository(db), new ReadingListRepository(db)));

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
  let readingListRepo: ReadingListRepository;

  beforeEach(() => {
    db = createDatabase();
    libraryRepo = new LibraryRepository(db);
    settingsRepo = new SettingsRepository(db);
    readingListRepo = new ReadingListRepository(db);
  });

  it('adds unknown comics, overwrites known ones and leaves the rest alone', () => {
    const known = libraryRepo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    libraryRepo.updateRating(known.id, 1);
    libraryRepo.touch('/comics/local-only.cbz', 'Local', 5, 5, 10);

    const summary = applyImport(
      libraryRepo,
      settingsRepo,
      readingListRepo,
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

  it('round-trips the looked-up metadata and credits through an export', () => {
    const entry = libraryRepo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    libraryRepo.updateMetadata(entry.id, {
      title: 'Le Lotus bleu',
      series: 'Tintin',
      volume: '5',
      releaseDate: '1936',
      language: 'fr',
      credits: [{ firstName: '', lastName: 'Hergé', role: 'author' }],
    });
    const raw = JSON.stringify(buildExport(libraryRepo, settingsRepo, readingListRepo));

    const targetDb = createDatabase();
    const target = new LibraryRepository(targetDb);
    applyImport(target, new SettingsRepository(targetDb), new ReadingListRepository(targetDb), parseExport(raw));

    expect(target.list()[0]).toMatchObject({
      title: 'Le Lotus bleu',
      titleLocked: true,
      series: 'Tintin',
      volume: '5',
      releaseDate: '1936',
      language: 'fr',
      credits: [{ firstName: '', lastName: 'Hergé', role: 'author' }],
    });
  });

  it('drops credits without a last name or with an unknown role', () => {
    const parsed = parseExport(
      JSON.stringify({
        version: 1,
        library: [
          {
            path: '/comics/one.cbz',
            credits: [
              { firstName: 'A', lastName: 'Ok', role: 'writer' },
              { firstName: 'B', lastName: '', role: 'writer' },
              { firstName: 'C', lastName: 'Bad', role: 'editor' },
            ],
          },
        ],
      }),
    );
    expect(parsed.library[0].credits).toMatchObject([{ lastName: 'Ok', role: 'writer' }]);
  });

  it('replaces the stored settings', () => {
    settingsRepo.set('readingMode', 'continuous');

    applyImport(
      libraryRepo,
      settingsRepo,
      readingListRepo,
      parseExport(JSON.stringify({ version: 1, library: [], settings: { readerBackground: '#ffffff' } })),
    );

    expect(settingsRepo.getAll()).toEqual({ ...DEFAULT_SETTINGS, readerBackground: '#ffffff' });
  });

  it('round-trips reading lists, matching their books by path', () => {
    const one = libraryRepo.touch('/comics/one.cbz', 'One', 20, 22, 1);
    const two = libraryRepo.touch('/comics/two.cbz', 'Two', 20, 22, 1);
    const created = readingListRepo.create('Pile');
    if (created.status !== 'ok') throw new Error(created.message);
    readingListRepo.addEntry(created.list.id, two.id);
    readingListRepo.addEntry(created.list.id, one.id);
    const raw = JSON.stringify(buildExport(libraryRepo, settingsRepo, readingListRepo));

    const targetDb = createDatabase();
    const target = new LibraryRepository(targetDb);
    // The target already knows one.cbz, under its own id.
    const local = target.touch('/comics/one.cbz', 'One', 20, 22, 1);
    const targetLists = new ReadingListRepository(targetDb);
    applyImport(target, new SettingsRepository(targetDb), targetLists, parseExport(raw));

    const [list] = targetLists.list();
    const twoId = target.list().find((entry) => entry.path === '/comics/two.cbz')?.id;
    expect(list).toMatchObject({ id: created.list.id, name: 'Pile', entryIds: [twoId, local.id] });
  });

  it("applies the snapshot's order of the reading lists, local-only lists last", () => {
    const local = readingListRepo.create('Locale');
    const shared = readingListRepo.create('Partagée');
    if (local.status !== 'ok' || shared.status !== 'ok') throw new Error('create failed');

    applyImport(
      libraryRepo,
      settingsRepo,
      readingListRepo,
      parseExport(
        JSON.stringify({
          version: 1,
          library: [],
          readingLists: [
            { id: 'new', name: 'Nouvelle', createdAt: '2024-01-01', paths: [] },
            { id: shared.list.id, name: 'Partagée', createdAt: shared.list.createdAt, paths: [] },
          ],
        }),
      ),
    );

    expect(readingListRepo.list().map((list) => list.name)).toEqual(['Nouvelle', 'Partagée', 'Locale']);
  });

  it('drops broken reading lists and paths missing from the library', () => {
    const parsed = parseExport(
      JSON.stringify({
        version: 1,
        library: [{ path: '/comics/one.cbz' }],
        readingLists: [
          { name: 'No id' },
          { id: 'x', name: '  ' },
          { id: 'l1', name: 'Pile', paths: ['/comics/one.cbz', '/comics/gone.cbz', 3] },
        ],
      }),
    );
    expect(parsed.readingLists).toHaveLength(1);

    applyImport(libraryRepo, settingsRepo, readingListRepo, parsed);

    expect(readingListRepo.get('l1')?.entryIds).toEqual([libraryRepo.list()[0].id]);
  });
});

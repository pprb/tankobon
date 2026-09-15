import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { LibraryRepository } from './library-repository';

function createRepository(): LibraryRepository {
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
  `);
  return new LibraryRepository(db);
}

describe('LibraryRepository', () => {
  let repo: LibraryRepository;

  beforeEach(() => {
    repo = createRepository();
  });

  it('creates a new entry on first touch', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    expect(entry).toMatchObject({
      path: '/comics/one.cbz',
      title: 'One',
      pageCount: 20,
      currentPage: 0,
      fileCount: 22,
      fileSize: 123456,
      rating: 0,
      tags: [],
    });
    expect(repo.list()).toHaveLength(1);
  });

  it('reuses the existing entry for the same path', () => {
    const first = repo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    const second = repo.touch('/comics/one.cbz', 'One', 20, 22, 123456);
    expect(second.id).toBe(first.id);
    expect(repo.list()).toHaveLength(1);
  });

  it('refreshes file count and size on touch', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    const reopened = repo.touch('/comics/one.cbz', 'One', 20, 25, 2000);
    expect(reopened.id).toBe(entry.id);
    expect(reopened).toMatchObject({ fileCount: 25, fileSize: 2000 });
  });

  it('clamps the current page if the page count shrinks', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.updateProgress(entry.id, 15);
    const reopened = repo.touch('/comics/one.cbz', 'One', 10, 12, 1000);
    expect(reopened.currentPage).toBe(9);
  });

  it('persists reading progress', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.updateProgress(entry.id, 7);
    expect(repo.list()[0].currentPage).toBe(7);
  });

  it('persists a rating without touching it back to 0 on reopen', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.updateRating(entry.id, 4);
    const reopened = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    expect(reopened.rating).toBe(4);
  });

  it('persists tags without touching them back to empty on reopen', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.updateTags(entry.id, ['Lu', 'Favori']);
    const reopened = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    expect(reopened.tags).toEqual(['Lu', 'Favori']);
  });

  it('overwrites tags on repeated writes', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.updateTags(entry.id, ['À lire']);
    repo.updateTags(entry.id, ['Lu']);
    expect(repo.list()[0].tags).toEqual(['Lu']);
  });

  it('removes an entry', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20, 22, 1000);
    repo.remove(entry.id);
    expect(repo.list()).toHaveLength(0);
  });
});

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
      last_opened_at TEXT NOT NULL
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
    const entry = repo.touch('/comics/one.cbz', 'One', 20);
    expect(entry).toMatchObject({ path: '/comics/one.cbz', title: 'One', pageCount: 20, currentPage: 0 });
    expect(repo.list()).toHaveLength(1);
  });

  it('reuses the existing entry for the same path', () => {
    const first = repo.touch('/comics/one.cbz', 'One', 20);
    const second = repo.touch('/comics/one.cbz', 'One', 20);
    expect(second.id).toBe(first.id);
    expect(repo.list()).toHaveLength(1);
  });

  it('clamps the current page if the page count shrinks', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20);
    repo.updateProgress(entry.id, 15);
    const reopened = repo.touch('/comics/one.cbz', 'One', 10);
    expect(reopened.currentPage).toBe(9);
  });

  it('persists reading progress', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20);
    repo.updateProgress(entry.id, 7);
    expect(repo.list()[0].currentPage).toBe(7);
  });

  it('removes an entry', () => {
    const entry = repo.touch('/comics/one.cbz', 'One', 20);
    repo.remove(entry.id);
    expect(repo.list()).toHaveLength(0);
  });
});

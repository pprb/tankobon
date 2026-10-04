import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { LibraryFolderRepository } from './library-folder-repository';
import { migrate } from './schema';

function repository(): LibraryFolderRepository {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  return new LibraryFolderRepository(db);
}

describe('LibraryFolderRepository', () => {
  it('starts empty', () => {
    expect(repository().list()).toEqual([]);
  });

  it('remembers a folder once, however many times it is added', () => {
    const repo = repository();
    repo.add('/comics');
    repo.add('/comics');
    expect(repo.list()).toEqual(['/comics']);
  });

  it('forgets a folder', () => {
    const repo = repository();
    repo.add('/a');
    repo.add('/b');
    repo.remove('/a');
    expect(repo.list()).toEqual(['/b']);
  });
});

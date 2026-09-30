import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../../shared/settings';
import { SettingsRepository } from './settings-repository';

function createRepository(): SettingsRepository {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  return new SettingsRepository(db);
}

describe('SettingsRepository', () => {
  let repo: SettingsRepository;

  beforeEach(() => {
    repo = createRepository();
  });

  it('falls back to defaults when nothing is stored', () => {
    expect(repo.getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists and returns updated values', () => {
    repo.set('readingDirection', 'rtl');
    expect(repo.getAll()).toEqual({ ...DEFAULT_SETTINGS, readingDirection: 'rtl' });
  });

  it('overwrites a value on repeated writes', () => {
    repo.set('readingDirection', 'rtl');
    repo.set('readingDirection', 'ltr');
    expect(repo.getAll().readingDirection).toBe('ltr');
  });
});

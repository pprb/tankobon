import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { AchievementRepository } from './achievement-repository';
import { migrate } from './schema';

describe('AchievementRepository', () => {
  let db: DatabaseSync;
  let repo: AchievementRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    migrate(db);
    repo = new AchievementRepository(db);
  });

  it('starts empty', () => {
    expect(repo.list()).toEqual([]);
  });

  it('returns only the new achievements and keeps the first date', () => {
    const first = repo.unlock(['firstBook', 'nightOwl', 'firstBook'], new Date('2026-01-01T10:00:00Z'));
    expect(first.map((a) => a.id)).toEqual(['firstBook', 'nightOwl']);

    const second = repo.unlock(['firstBook', 'librarian'], new Date('2026-02-01T10:00:00Z'));
    expect(second).toEqual([{ id: 'librarian', unlockedAt: '2026-02-01T10:00:00.000Z' }]);

    expect(repo.list()).toEqual([
      { id: 'firstBook', unlockedAt: '2026-01-01T10:00:00.000Z' },
      { id: 'nightOwl', unlockedAt: '2026-01-01T10:00:00.000Z' },
      { id: 'librarian', unlockedAt: '2026-02-01T10:00:00.000Z' },
    ]);
  });

  it('skips a stored id this build does not know', () => {
    db.prepare('INSERT INTO achievements (id, unlocked_at) VALUES (?, ?)').run('future', '2026-01-01T00:00:00.000Z');
    expect(repo.list()).toEqual([]);
  });
});

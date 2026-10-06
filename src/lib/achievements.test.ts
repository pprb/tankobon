import { describe, expect, it } from 'vitest';

import type { LibraryEntry } from '@/shared/library';
import type { ReadingList } from '@/shared/reading-list';

import { achievementProgress, computeStats, earnedFromStats, eventAchievements } from './achievements';

function entry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: crypto.randomUUID(),
    path: '/books/a.cbz',
    title: 'A',
    pageCount: 10,
    currentPage: 0,
    addedAt: '2026-01-01T00:00:00.000Z',
    lastOpenedAt: '2026-01-01T00:00:00.000Z',
    fileCount: 10,
    fileSize: 1,
    rating: 0,
    tags: [],
    titleLocked: false,
    series: null,
    volume: null,
    releaseDate: null,
    language: null,
    avgPageWidth: null,
    avgPageHeight: null,
    credits: [],
    ...overrides,
  };
}

const list = (count: number): ReadingList => ({
  id: crypto.randomUUID(),
  name: 'L',
  createdAt: '2026-01-01T00:00:00.000Z',
  entryIds: Array.from({ length: count }, (_, i) => String(i)),
});

describe('computeStats', () => {
  it('counts finished books, formats, languages and tags (quick tags excluded)', () => {
    const stats = computeStats(
      [
        entry({ currentPage: 9, path: '/a.cbz', language: 'fr', tags: ['Lu', 'seinen'] }),
        entry({ path: '/b.pdf', language: 'en', rating: 4, tags: ['seinen', 'shonen', 'À lire'] }),
        entry({ path: '/c.cbr', tags: ['Lu'] }),
      ],
      [list(3), list(7)],
      2,
    );
    expect(stats).toMatchObject({
      finished: 2,
      books: 3,
      formats: 3,
      languages: 2,
      tags: 2,
      rated: 1,
      lists: 2,
      longestList: 7,
      folders: 2,
    });
  });
});

describe('earnedFromStats', () => {
  it('earns the tiers the counts reach', () => {
    const library = Array.from({ length: 100 }, (_, i) => entry({ path: `/${i}.cbz`, tags: ['Lu'] }));
    const ids = earnedFromStats(computeStats(library, [], 0));
    expect(ids).toEqual(expect.arrayContaining(['firstBook', 'finished10', 'finished50', 'librarian']));
    expect(ids).not.toContain('finished200');
    expect(ids).not.toContain('archivist');
  });

  it('never earns an achievement that needs an event', () => {
    const ids = earnedFromStats(computeStats([], [], 0));
    expect(ids).toEqual([]);
  });

  it('earns the list master with five lists or a full one', () => {
    expect(earnedFromStats(computeStats([], [list(1), list(1), list(1), list(1), list(1)], 0))).toContain('listMaster');
    expect(earnedFromStats(computeStats([], [list(50)], 0))).toContain('listMaster');
    expect(earnedFromStats(computeStats([], [list(49)], 0))).not.toContain('listMaster');
  });
});

describe('eventAchievements', () => {
  it('earns the night owl between 22:00 and 05:00', () => {
    expect(eventAchievements({ at: new Date(2026, 0, 1, 22, 0), direction: 'ltr' })).toEqual(['nightOwl']);
    expect(eventAchievements({ at: new Date(2026, 0, 1, 4, 59), direction: 'ltr' })).toEqual(['nightOwl']);
    expect(eventAchievements({ at: new Date(2026, 0, 1, 21, 59), direction: 'ltr' })).toEqual([]);
  });

  it('earns the early bird between 05:00 and 07:00, and right to left', () => {
    expect(eventAchievements({ at: new Date(2026, 0, 1, 6, 30), direction: 'rtl' })).toEqual(['earlyBird', 'rightToLeft']);
    expect(eventAchievements({ at: new Date(2026, 0, 1, 7, 0), direction: 'ltr' })).toEqual([]);
  });
});

describe('achievementProgress', () => {
  it('caps the value and is null for an event', () => {
    const stats = computeStats([entry({ tags: ['Lu'] })], [], 0);
    expect(achievementProgress('finished10', stats)).toEqual({ value: 1, target: 10 });
    expect(achievementProgress('firstBook', stats)).toEqual({ value: 1, target: 1 });
    expect(achievementProgress('nightOwl', stats)).toBeNull();
  });
});

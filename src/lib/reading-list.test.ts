import { describe, expect, it } from 'vitest';

import type { LibraryEntry } from '@/shared/library';

import { isFinished, listEntries, listProgress, moveItem, moveUnfinished, nextToRead } from './reading-list';

function entry(id: string, overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id,
    path: `/comics/${id}.cbz`,
    title: id,
    pageCount: 10,
    currentPage: 0,
    addedAt: '2024-01-01',
    lastOpenedAt: '2024-01-01',
    fileCount: 10,
    fileSize: 1,
    rating: 0,
    tags: [],
    titleLocked: false,
    series: null,
    volume: null,
    releaseDate: null,
    language: null,
    credits: [],
    ...overrides,
  };
}

const done = (id: string) => entry(id, { currentPage: 9 });

describe('isFinished', () => {
  it('is true on the last page or with the Lu tag', () => {
    expect(isFinished(entry('a'))).toBe(false);
    expect(isFinished(entry('a', { currentPage: 8 }))).toBe(false);
    expect(isFinished(done('a'))).toBe(true);
    expect(isFinished(entry('a', { tags: ['Lu'] }))).toBe(true);
  });

  it('is false for an empty book never tagged', () => {
    expect(isFinished(entry('a', { pageCount: 0 }))).toBe(false);
  });
});

describe('listEntries', () => {
  it('follows the list order and skips ids missing from the library', () => {
    const library = [entry('a'), entry('b'), entry('c')];
    const list = { id: 'l', name: 'L', createdAt: '', entryIds: ['c', 'gone', 'a'] };
    expect(listEntries(list, library).map((e) => e.id)).toEqual(['c', 'a']);
  });
});

describe('listProgress', () => {
  it('counts finished books', () => {
    expect(listProgress([done('a'), entry('b'), entry('c'), done('d')])).toEqual({ finished: 2, total: 4, percent: 50 });
    expect(listProgress([])).toEqual({ finished: 0, total: 0, percent: 0 });
  });
});

describe('nextToRead', () => {
  it('is the first unfinished book', () => {
    expect(nextToRead([done('a'), entry('b'), entry('c')])?.id).toBe('b');
    expect(nextToRead([done('a'), entry('b'), entry('c')], 'b')?.id).toBe('c');
    expect(nextToRead([done('a')])).toBeNull();
  });
});

describe('moveUnfinished', () => {
  const finished = new Set(['x', 'y']);

  it('moves unfinished books around pinned finished ones', () => {
    // x and y keep their indices (0 and 2).
    expect(moveUnfinished(['x', 'a', 'y', 'b', 'c'], finished, 4, 1)).toEqual(['x', 'c', 'y', 'a', 'b']);
    expect(moveUnfinished(['x', 'a', 'y', 'b', 'c'], finished, 1, 4)).toEqual(['x', 'b', 'y', 'c', 'a']);
    expect(moveUnfinished(['a', 'b', 'c'], new Set(), 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('refuses to move a finished book or onto one', () => {
    expect(moveUnfinished(['x', 'a', 'b'], finished, 0, 1)).toBeNull();
    expect(moveUnfinished(['x', 'a', 'b'], finished, 2, 0)).toBeNull();
  });

  it('refuses no-op and out-of-range moves', () => {
    expect(moveUnfinished(['a', 'b'], finished, 1, 1)).toBeNull();
    expect(moveUnfinished(['a', 'b'], finished, 0, 2)).toBeNull();
    expect(moveUnfinished(['a', 'b'], finished, -1, 0)).toBeNull();
  });
});

describe('moveItem', () => {
  it('moves an item down or up, shifting the ones in between', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItem(['a', 'b'], 1, 0)).toEqual(['b', 'a']);
  });

  it('refuses a no-op or out-of-range move, leaving the input alone', () => {
    const items = ['a', 'b', 'c'];
    expect(moveItem(items, 1, 1)).toBeNull();
    expect(moveItem(items, -1, 0)).toBeNull();
    expect(moveItem(items, 0, 3)).toBeNull();
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

import { describe, expect, it } from 'vitest';

import { imageMimeType, isPageEntry, sortPages } from './comic-archive';

describe('imageMimeType', () => {
  it('maps known image extensions', () => {
    expect(imageMimeType('page.jpg')).toBe('image/jpeg');
    expect(imageMimeType('page.PNG')).toBe('image/png');
  });

  it('returns undefined for unknown extensions', () => {
    expect(imageMimeType('notes.txt')).toBeUndefined();
  });
});

describe('isPageEntry', () => {
  it('accepts image entries', () => {
    expect(isPageEntry('page1.jpg')).toBe(true);
  });

  it('rejects hidden files', () => {
    expect(isPageEntry('.hidden.jpg')).toBe(false);
  });

  it('rejects macOS resource forks', () => {
    expect(isPageEntry('__MACOSX/._page1.jpg')).toBe(false);
  });

  it('rejects non-image entries', () => {
    expect(isPageEntry('ComicInfo.xml')).toBe(false);
  });
});

describe('sortPages', () => {
  it('sorts numbered pages in natural order', () => {
    expect(sortPages(['page10.jpg', 'page2.jpg', 'page1.jpg'])).toEqual([
      'page1.jpg',
      'page2.jpg',
      'page10.jpg',
    ]);
  });
});

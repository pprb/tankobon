import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { applyLanguage } from '@/shared/i18n';

import { formatFileSize, formatLanguage } from './utils';

describe('formatFileSize', () => {
  beforeAll(() => applyLanguage('fr'));
  afterAll(() => applyLanguage('en'));

  it('shows bytes for tiny sizes', () => {
    expect(formatFileSize(0)).toBe('0 o');
    expect(formatFileSize(500)).toBe('500 o');
  });

  it('shows kilobytes with one decimal below 10', () => {
    expect(formatFileSize(1536)).toBe('1,5 Ko');
  });

  it('shows megabytes without decimals at 10 and above', () => {
    expect(formatFileSize(45_300_000)).toBe('43 Mo');
  });

  it('shows gigabytes with one decimal below 10', () => {
    expect(formatFileSize(1_200_000_000)).toBe('1,1 Go');
  });

  it('follows the interface language', () => {
    applyLanguage('en');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1_200_000_000)).toBe('1.1 GB');
    applyLanguage('fr');
  });
});

describe('formatLanguage', () => {
  afterAll(() => applyLanguage('en'));

  it('names a language in the interface language', () => {
    applyLanguage('fr');
    expect(formatLanguage('fr')).toBe('français');
    expect(formatLanguage('en')).toBe('anglais');
    applyLanguage('en');
    expect(formatLanguage('fr')).toBe('French');
  });

  it('passes null and malformed codes through', () => {
    expect(formatLanguage(null)).toBeNull();
    expect(formatLanguage('not a code!')).toBe('not a code!');
  });
});

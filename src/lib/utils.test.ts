import { describe, expect, it } from 'vitest';

import { formatFileSize, formatLanguage } from './utils';

describe('formatFileSize', () => {
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
});

describe('formatLanguage', () => {
  it('names a language in French', () => {
    expect(formatLanguage('fr')).toBe('français');
    expect(formatLanguage('en')).toBe('anglais');
  });

  it('passes null and malformed codes through', () => {
    expect(formatLanguage(null)).toBeNull();
    expect(formatLanguage('not a code!')).toBe('not a code!');
  });
});

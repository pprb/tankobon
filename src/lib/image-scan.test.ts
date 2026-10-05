import { describe, expect, it } from 'vitest';

import { formatPageSize, imageScanPercent } from './image-scan';

describe('imageScanPercent', () => {
  it('rounds the share of books measured', () => {
    expect(imageScanPercent({ processed: 1, total: 3 })).toBe(33);
    expect(imageScanPercent({ processed: 3, total: 3 })).toBe(100);
  });

  it('is 0 while the total is unknown, and never leaves 0–100', () => {
    expect(imageScanPercent({ processed: 0, total: 0 })).toBe(0);
    expect(imageScanPercent({ processed: 5, total: 3 })).toBe(100);
    expect(imageScanPercent({ processed: -1, total: 3 })).toBe(0);
  });
});

describe('formatPageSize', () => {
  it('is null until the book is measured', () => {
    expect(formatPageSize({ avgPageWidth: null, avgPageHeight: null })).toBeNull();
    expect(formatPageSize({ avgPageWidth: 1000, avgPageHeight: null })).toBeNull();
  });

  it('writes width × height in pixels', () => {
    expect(formatPageSize({ avgPageWidth: 1200, avgPageHeight: 1800 }, 'en')).toBe('1,200 × 1,800 px');
  });
});

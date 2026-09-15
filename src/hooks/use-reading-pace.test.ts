import { describe, expect, it } from 'vitest';

import { formatRemainingTime } from './use-reading-pace';

describe('formatRemainingTime', () => {
  it('shows a floor message under a minute', () => {
    expect(formatRemainingTime(0.4)).toBe('< 1 min');
  });

  it('shows minutes only under an hour', () => {
    expect(formatRemainingTime(45)).toBe('45 min');
  });

  it('rounds to the nearest minute', () => {
    expect(formatRemainingTime(45.6)).toBe('46 min');
  });

  it('shows hours only on an exact hour', () => {
    expect(formatRemainingTime(120)).toBe('2 h');
  });

  it('shows hours and minutes', () => {
    expect(formatRemainingTime(95)).toBe('1 h 35 min');
  });
});

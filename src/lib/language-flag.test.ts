import { describe, expect, it } from 'vitest';
import { languageFlag, withFlag } from './language-flag';

describe('languageFlag', () => {
  it('maps a language to its country flag', () => {
    expect(languageFlag('fr')).toBe('🇫🇷');
    expect(languageFlag('en')).toBe('🇬🇧');
    expect(languageFlag('ja')).toBe('🇯🇵');
  });

  it('ignores the case and the region', () => {
    expect(languageFlag('FR')).toBe('🇫🇷');
    expect(languageFlag('fr-CA')).toBe('🇫🇷');
  });

  it('returns null for an empty or unknown code', () => {
    expect(languageFlag(null)).toBeNull();
    expect(languageFlag('')).toBeNull();
    expect(languageFlag('xx')).toBeNull();
  });
});

describe('withFlag', () => {
  it('prefixes the name with the flag when there is one', () => {
    expect(withFlag('fr', 'Français')).toBe('🇫🇷 Français');
    expect(withFlag('xx', 'Klingon')).toBe('Klingon');
  });
});

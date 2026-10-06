import { describe, expect, it } from 'vitest';
import { languageCountry } from './language-flag';

describe('languageCountry', () => {
  it('maps a language to the country whose flag stands for it', () => {
    expect(languageCountry('fr')).toBe('FR');
    expect(languageCountry('en')).toBe('GB');
    expect(languageCountry('ja')).toBe('JP');
  });

  it('ignores the case and the region', () => {
    expect(languageCountry('FR')).toBe('FR');
    expect(languageCountry('fr-CA')).toBe('FR');
  });

  it('returns null for an empty or unknown code', () => {
    expect(languageCountry(null)).toBeNull();
    expect(languageCountry('')).toBeNull();
    expect(languageCountry('xx')).toBeNull();
  });
});

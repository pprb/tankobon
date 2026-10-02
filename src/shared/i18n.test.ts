import { afterEach, describe, expect, it } from 'vitest';

import en from '../locales/en';
import fr from '../locales/fr';
import { applyLanguage, currentLanguage, FALLBACK_LANGUAGE, resolveLanguage, t } from './i18n';

/** Every leaf of a locale, as `namespace.path.to.key` → string. */
function leaves(node: object, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result.set(path, value);
    else for (const [leaf, text] of leaves(value as object, path)) result.set(leaf, text);
  }
  return result;
}

const variables = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();

describe('resolveLanguage', () => {
  it('uses the language forced in the settings', () => {
    expect(resolveLanguage('fr', ['en-US'])).toBe('fr');
    expect(resolveLanguage('en', ['fr-FR'])).toBe('en');
  });

  it('follows the OS for `system`, ignoring the region', () => {
    expect(resolveLanguage('system', ['fr-FR', 'en-US'])).toBe('fr');
    expect(resolveLanguage('system', ['fr_CA'])).toBe('fr');
    expect(resolveLanguage('system', ['en-GB'])).toBe('en');
  });

  it('takes the first supported OS language', () => {
    expect(resolveLanguage('system', ['de-DE', 'fr-FR'])).toBe('fr');
  });

  it('falls back to English when no OS language is supported', () => {
    expect(resolveLanguage('system', ['de-DE', 'ja'])).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage('system', [])).toBe('en');
  });

  it('treats an unknown setting as `system`', () => {
    expect(resolveLanguage('de', ['fr-FR'])).toBe('fr');
  });
});

describe('locales', () => {
  const english = leaves(en);
  const french = leaves(fr);

  it('have the same keys', () => {
    expect([...french.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('use the same interpolation variables', () => {
    for (const [key, text] of english) {
      expect(variables(french.get(key) ?? ''), key).toEqual(variables(text));
    }
  });

  it('leave no string empty', () => {
    for (const [key, text] of [...english, ...french]) {
      expect(text.trim(), key).not.toBe('');
    }
  });
});

describe('t', () => {
  afterEach(() => applyLanguage('en'));

  it('starts in English and switches language', () => {
    expect(currentLanguage()).toBe('en');
    expect(t('nav:settings')).toBe('Settings');
    applyLanguage('fr');
    expect(currentLanguage()).toBe('fr');
    expect(t('nav:settings')).toBe('Paramètres');
  });

  it('picks the plural form of each language', () => {
    expect(t('library:fileCount', { count: 1 })).toBe('1 file');
    expect(t('library:fileCount', { count: 3 })).toBe('3 files');
    applyLanguage('fr');
    // French uses the singular for 0 too.
    expect(t('library:fileCount', { count: 0 })).toBe('0 fichier');
    expect(t('library:fileCount', { count: 3 })).toBe('3 fichiers');
  });
});

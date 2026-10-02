/**
 * Translations of the user interface, shared by the main process (native dialogs, error messages)
 * and the renderer. Each process holds its own {@link i18n} instance, loaded synchronously with
 * every locale (they are bundled, nothing is fetched), and switches it with {@link applyLanguage}.
 * The strings live in `src/locales/<language>/<namespace>.ts`, one file per area of the app.
 * @module
 */
import { createInstance } from 'i18next';

import en from '../locales/en';
import fr from '../locales/fr';

/** The languages the interface is translated into. */
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

/** One of {@link SUPPORTED_LANGUAGES}. */
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** The `language` setting: a language forced by the user, or `system` to follow the OS. */
export type LanguageSetting = Language | 'system';

/** Used when the OS language isn't supported, and for any string missing from a locale. */
export const FALLBACK_LANGUAGE: Language = 'en';

/** Each language's name in that language, for the settings picker (never translated). */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
};

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof en;
  }
}

/** Whether `value` is one of {@link SUPPORTED_LANGUAGES}. */
export function isSupportedLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * The language to show: the one forced in the settings, else the first of the OS's preferred
 * locales (`fr-FR`, `en-US`…) that the app supports, else {@link FALLBACK_LANGUAGE}. An unknown
 * setting value (a hand-edited export) counts as `system`.
 */
export function resolveLanguage(setting: string, systemLocales: readonly string[]): Language {
  if (isSupportedLanguage(setting)) return setting;
  for (const locale of systemLocales) {
    const base = locale.split(/[-_]/)[0].toLowerCase();
    if (isSupportedLanguage(base)) return base;
  }
  return FALLBACK_LANGUAGE;
}

/** This process's translation instance. Starts in {@link FALLBACK_LANGUAGE} until {@link applyLanguage}. */
export const i18n = createInstance();

void i18n.init({
  resources: { en, fr },
  lng: FALLBACK_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: Object.keys(en),
  defaultNS: 'common',
  // React already escapes what it renders; the main process never builds HTML.
  interpolation: { escapeValue: false },
  // Every resource is bundled: initialise synchronously, so `t()` works from the first line.
  initAsync: false,
});

/** Translates a key (`'namespace:path.to.key'`) in the current language. */
export const t: typeof i18n.t = i18n.t.bind(i18n);

/** Switches this process to `language`. Synchronous in practice, since every resource is bundled. */
export function applyLanguage(language: Language): void {
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

/** The language currently shown, as a BCP 47 tag for `Intl` APIs and `<html lang>`. */
export function currentLanguage(): Language {
  return isSupportedLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
}

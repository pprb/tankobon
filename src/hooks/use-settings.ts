/**
 * App settings as React state.
 * @module
 */
import { useCallback, useEffect, useState } from 'react';

import { applyLanguage, type Language, type LanguageSetting, resolveLanguage } from '@/shared/i18n';
import { DEFAULT_SETTINGS, type AppSettings } from '@/shared/settings';

/** The OS's preferred languages, from the main process (see {@link loadSystemLanguages}). */
let systemLanguages: readonly string[] = navigator.languages;

/**
 * Fetches the OS's preferred languages from the main process, so the `system` setting resolves to
 * the same language on both sides. Until then (or if it fails), `navigator.languages` stands in.
 */
export async function loadSystemLanguages(): Promise<void> {
  try {
    systemLanguages = await window.tankobon.app.getSystemLanguages();
  } catch {
    // Keeps `navigator.languages`.
  }
}

/** The language the `system` setting currently stands for. */
export function systemLanguage(): Language {
  return resolveLanguage('system', systemLanguages);
}

/**
 * Switches the renderer to the language the `language` setting resolves to (the OS's for
 * `system`), and sets `<html lang>` to match. Components using `useTranslation()` re-render on
 * their own.
 */
export function applyInterfaceLanguage(setting: LanguageSetting): void {
  const language = resolveLanguage(setting, systemLanguages);
  applyLanguage(language);
  document.documentElement.lang = language;
}

/** Owns the app settings: loads them from the database once, persists changes. */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  /** Re-reads the database — needed after an import replaces the stored settings behind our back. */
  const reload = useCallback(
    () =>
      window.tankobon.settings.getAll().then((loaded) => {
        setSettings(loaded);
        applyInterfaceLanguage(loaded.language);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void window.tankobon.settings.getAll().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    if (key === 'language') applyInterfaceLanguage(value as LanguageSetting);
    void window.tankobon.settings.set(key, value);
  }, []);

  return {
    settings,
    /** Updates one setting in the UI immediately and persists it in the background. */
    update,
    reload,
  };
}

/**
 * App settings as React state.
 * @module
 */
import { useCallback, useEffect, useState } from 'react';

import { applyLanguage, type Language, type LanguageSetting, resolveLanguage } from '@/shared/i18n';
import { DEFAULT_SETTINGS, isApiKeySetting, toPublicSettings, type AppSettings, type PublicSettings } from '@/shared/settings';

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

const changes = new EventTarget();
const CHANGED = 'changed';

/**
 * Tells every mounted {@link useSettings} to re-read the database. Call it after something wrote
 * settings behind the hooks' back (the data import), so no view keeps a stale copy, such as the
 * sidebar's `sidebarCollapsed`.
 */
export function notifySettingsChanged() {
  changes.dispatchEvent(new Event(CHANGED));
}

/**
 * Owns the app settings: loads them from the database on mount and on every
 * {@link notifySettingsChanged}, persists changes.
 */
export function useSettings() {
  const [settings, setSettings] = useState<PublicSettings>(() => toPublicSettings(DEFAULT_SETTINGS));

  useEffect(() => {
    let cancelled = false;
    const load = (applyLang: boolean) => {
      void window.tankobon.settings.getAll().then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        if (applyLang) applyInterfaceLanguage(loaded.language);
      });
    };
    load(false);
    const onChanged = () => load(true);
    changes.addEventListener(CHANGED, onChanged);
    return () => {
      cancelled = true;
      changes.removeEventListener(CHANGED, onChanged);
    };
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!isApiKeySetting(key)) setSettings((s) => ({ ...s, [key]: value }));
    if (key === 'language') applyInterfaceLanguage(value as LanguageSetting);
    void window.tankobon.settings.set(key, value);
  }, []);

  return {
    settings,
    /** Updates one setting in the UI immediately and persists it in the background. */
    update,
  };
}

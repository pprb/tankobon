import { app } from 'electron';

import { applyLanguage, resolveLanguage, type Language } from '../shared/i18n';

const listeners: Array<(language: Language) => void> = [];

/** Calls `listener` with the resolved language each time `applyMainLanguage()` runs (the decoder process follows it). */
export function onMainLanguageApplied(listener: (language: Language) => void): void {
  listeners.push(listener);
}

/**
 * Switches the main process's messages and native dialogs to the `language` setting, resolved
 * against the OS's preferred languages (the same list the renderer gets from `app:get-system-languages`).
 */
export function applyMainLanguage(setting: string): void {
  const language = resolveLanguage(setting, app.getPreferredSystemLanguages());
  applyLanguage(language);
  for (const listener of listeners) {
    listener(language);
  }
}

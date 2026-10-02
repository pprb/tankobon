import { app } from 'electron';

import { applyLanguage, resolveLanguage } from '../shared/i18n';

/**
 * Switches the main process's messages and native dialogs to the `language` setting, resolved
 * against the OS's preferred languages (the same list the renderer gets from `app:get-system-languages`).
 */
export function applyMainLanguage(setting: string): void {
  applyLanguage(resolveLanguage(setting, app.getPreferredSystemLanguages()));
}

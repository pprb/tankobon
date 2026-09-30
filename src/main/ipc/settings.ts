import { ipcMain } from 'electron';

import type { AppSettings } from '../../shared/settings';
import type { SettingsRepository } from '../db/settings-repository';

// Channel names are shared with preload.ts: keep them in sync.
export const SETTINGS_CHANNELS = {
  getAll: 'settings:get-all',
  set: 'settings:set',
} as const;

export function registerSettingsIpc(repo: SettingsRepository): void {
  ipcMain.handle(SETTINGS_CHANNELS.getAll, () => repo.getAll());

  ipcMain.handle(
    SETTINGS_CHANNELS.set,
    (_event, key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => repo.set(key, value),
  );
}

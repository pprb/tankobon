import { ipcMain } from 'electron';

import { isSettingKey, isValidSetting, pickApiKeys, toPublicSettings } from '../../shared/settings';
import type { SettingsRepository } from '../db/settings-repository';
import { applyMainLanguage } from '../language';
import { IpcArgumentError } from './validate';

// Channel names are shared with preload.ts: keep them in sync.
export const SETTINGS_CHANNELS = {
  getAll: 'settings:get-all',
  getApiKeys: 'settings:get-api-keys',
  set: 'settings:set',
} as const;

export function registerSettingsIpc(repo: SettingsRepository): void {
  // The API keys only go to the Métadonnées page, through their own channel.
  ipcMain.handle(SETTINGS_CHANNELS.getAll, () => toPublicSettings(repo.getAll()));

  ipcMain.handle(SETTINGS_CHANNELS.getApiKeys, () => pickApiKeys(repo.getAll()));

  ipcMain.handle(SETTINGS_CHANNELS.set, (_event, key: unknown, value: unknown) => {
    if (!isSettingKey(key)) {
      throw new IpcArgumentError('key', 'a setting name');
    }
    if (!isValidSetting(key, value)) {
      throw new IpcArgumentError('value', `a valid value for the setting "${key}"`);
    }
    repo.set(key, value);
    if (key === 'language') applyMainLanguage(String(value));
  });
}

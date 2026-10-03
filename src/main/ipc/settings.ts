import type { AppSettings } from '../../shared/settings';
import { isSettingKey, isSettingValue, tuple } from '../../shared/validation';
import type { SettingsRepository } from '../db/settings-repository';
import { applyMainLanguage } from '../language';
import { handle } from './handle';

// Channel names are shared with preload.ts: keep them in sync.
export const SETTINGS_CHANNELS = {
  getAll: 'settings:get-all',
  set: 'settings:set',
} as const;

export function registerSettingsIpc(repo: SettingsRepository): void {
  handle(SETTINGS_CHANNELS.getAll, tuple(), () => repo.getAll());

  // The value is checked against the key it is stored under (type, and the values the app knows).
  const isSettingEntry = (args: unknown[]): args is [keyof AppSettings, unknown] =>
    args.length === 2 && isSettingKey(args[0]) && isSettingValue(args[0], args[1]);

  handle(SETTINGS_CHANNELS.set, isSettingEntry, (_event, key, value) => {
    repo.set(key, value);
    if (key === 'language') applyMainLanguage(String(value));
  });
}

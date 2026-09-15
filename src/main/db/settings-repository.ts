import type { DatabaseSync } from 'node:sqlite';

import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/settings';

/** Persists application settings (key/value, JSON-encoded) to the local database. */
export class SettingsRepository {
  constructor(private readonly db: DatabaseSync) {}

  getAll(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];
    const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value) as unknown]));
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  set(key: keyof AppSettings, value: unknown): void {
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, JSON.stringify(value));
  }
}

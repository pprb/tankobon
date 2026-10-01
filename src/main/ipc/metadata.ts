import { app, ipcMain, net } from 'electron';

import type { MetadataQuery, MetadataSearchResult } from '../../shared/metadata';
import type { SettingsRepository } from '../db/settings-repository';
import { searchMetadata } from '../services/metadata-service';

// Channel names are shared with preload.ts: keep them in sync.
export const METADATA_CHANNELS = {
  search: 'metadata:search',
} as const;

export function registerMetadataIpc(settingsRepo: SettingsRepository): void {
  ipcMain.handle(METADATA_CHANNELS.search, (_event, query: MetadataQuery): Promise<MetadataSearchResult> =>
    searchMetadata(query, settingsRepo.getAll(), {
      // Chromium's network stack rather than Node's: it honours the system proxy settings.
      fetch: net.fetch as typeof fetch,
      userAgent: `Tankobon/${app.getVersion()}`,
      timeoutMs: 15_000,
    }),
  );
}

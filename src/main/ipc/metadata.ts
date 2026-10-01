import { app, ipcMain, net } from 'electron';

import type { MetadataPageResult, MetadataQuery, MetadataSearchResult } from '../../shared/metadata';
import type { SettingsRepository } from '../db/settings-repository';
import { fetchMetadataPage, searchMetadata } from '../services/metadata-service';
import type { HttpOptions } from '../services/http-json';

// Channel names are shared with preload.ts: keep them in sync.
export const METADATA_CHANNELS = {
  search: 'metadata:search',
  fromPage: 'metadata:from-page',
} as const;

function httpOptions(): HttpOptions {
  return {
    // Chromium's network stack rather than Node's: it honours the system proxy settings.
    fetch: net.fetch as typeof fetch,
    userAgent: `Tankobon/${app.getVersion()}`,
    timeoutMs: 15_000,
  };
}

export function registerMetadataIpc(settingsRepo: SettingsRepository): void {
  ipcMain.handle(METADATA_CHANNELS.search, (_event, query: MetadataQuery): Promise<MetadataSearchResult> =>
    searchMetadata(query, settingsRepo.getAll(), httpOptions()),
  );
  ipcMain.handle(METADATA_CHANNELS.fromPage, (_event, url: string): Promise<MetadataPageResult> =>
    fetchMetadataPage(url, httpOptions()),
  );
}

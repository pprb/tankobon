import { app, net } from 'electron';

import type { MetadataPageResult, MetadataSearchResult } from '../../shared/metadata';
import { isId, isMetadataQuery, tuple } from '../../shared/validation';
import type { SettingsRepository } from '../db/settings-repository';
import { fetchMetadataPage, searchMetadata } from '../services/metadata-service';
import type { HttpOptions } from '../services/http-json';
import { handle } from './handle';

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
  handle(METADATA_CHANNELS.search, tuple(isMetadataQuery), (_event, query): Promise<MetadataSearchResult> =>
    searchMetadata(query, settingsRepo.getAll(), httpOptions()),
  );
  handle(METADATA_CHANNELS.fromPage, tuple(isId), (_event, url): Promise<MetadataPageResult> =>
    fetchMetadataPage(url, httpOptions()),
  );
}

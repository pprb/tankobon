import type { LibraryEntry } from '../../shared/library';
import type { AppSettings } from '../../shared/settings';
import type { LibraryRepository } from './library-repository';
import type { SettingsRepository } from './settings-repository';

export interface ExportedData {
  version: 1;
  exportedAt: string;
  library: LibraryEntry[];
  settings: AppSettings;
}

/** Snapshots the whole local database for the user to export as a JSON file. */
export function buildExport(libraryRepo: LibraryRepository, settingsRepo: SettingsRepository): ExportedData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    library: libraryRepo.list(),
    settings: settingsRepo.getAll(),
  };
}

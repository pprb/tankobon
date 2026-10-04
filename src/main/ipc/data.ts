import { ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import type { DatabaseSync } from 'node:sqlite';

import type { ClearLibraryResult, ExportResult, ImportResult } from '../../shared/data';
import { t } from '../../shared/i18n';
import { buildExport, exportFileName } from '../db/export-service';
import { applyImport, parseExport } from '../db/import-service';
import type { LibraryRepository } from '../db/library-repository';
import type { ReadingListRepository } from '../db/reading-list-repository';
import type { SettingsRepository } from '../db/settings-repository';
import { applyMainLanguage } from '../language';
import { openDialogFor, saveDialogFor } from './dialogs';
import type { ThumbnailCache } from '../services/thumbnail-cache';

// Channel names are shared with preload.ts: keep them in sync.
export const DATA_CHANNELS = {
  export: 'data:export',
  import: 'data:import',
  clearLibrary: 'data:clear-library',
} as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerDataIpc(
  db: DatabaseSync,
  libraryRepo: LibraryRepository,
  settingsRepo: SettingsRepository,
  readingListRepo: ReadingListRepository,
  thumbnails: ThumbnailCache,
): void {
  ipcMain.handle(DATA_CHANNELS.export, async (event): Promise<ExportResult> => {
    const options: Electron.SaveDialogOptions = {
      title: t('dialogs:exportData'),
      defaultPath: exportFileName(new Date()),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const { canceled, filePath } = await saveDialogFor(event, options);
    if (canceled || !filePath) {
      return { status: 'cancelled' };
    }

    try {
      const data = buildExport(libraryRepo, settingsRepo, readingListRepo);
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { status: 'exported', filePath };
    } catch (error) {
      return { status: 'error', message: t('errors:data.exportFailed', { message: errorMessage(error) }) };
    }
  });

  ipcMain.handle(DATA_CHANNELS.import, async (event): Promise<ImportResult> => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:importData'),
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    try {
      const data = parseExport(await readFile(filePaths[0], 'utf-8'));
      const counts = applyImport(db, libraryRepo, settingsRepo, readingListRepo, data);
      // The settings were replaced, the language with them.
      applyMainLanguage(settingsRepo.getAll().language);
      // Thumbnails aren't part of an export: rebuild the cache in the background, without making
      // the import wait for every archive to be opened.
      void thumbnails.rebuild(libraryRepo.list().map((entry) => entry.path));
      return { status: 'imported', filePath: filePaths[0], ...counts };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(DATA_CHANNELS.clearLibrary, async (): Promise<ClearLibraryResult> => {
    try {
      const readingLists = readingListRepo.clear();
      const entries = libraryRepo.clear();
      // Every thumbnail now belongs to a book that is no longer in the library.
      await thumbnails.prune([]);
      return { status: 'cleared', entries, readingLists };
    } catch (error) {
      return { status: 'error', message: t('errors:data.clearFailed', { message: errorMessage(error) }) };
    }
  });
}

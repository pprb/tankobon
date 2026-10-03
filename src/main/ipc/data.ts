import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import type { DatabaseSync } from 'node:sqlite';

import type { ClearLibraryResult, ImportResult } from '../../shared/data';
import { t } from '../../shared/i18n';
import { buildExport, exportFileName } from '../db/export-service';
import { applyImport, parseExport } from '../db/import-service';
import type { DecoderClient } from '../decoder/decoder-client';
import type { LibraryRepository } from '../db/library-repository';
import type { ReadingListRepository } from '../db/reading-list-repository';
import type { SettingsRepository } from '../db/settings-repository';
import { applyMainLanguage } from '../language';

// Channel names are shared with preload.ts: keep them in sync.
export const DATA_CHANNELS = {
  export: 'data:export',
  import: 'data:import',
  clearLibrary: 'data:clear-library',
} as const;

export function registerDataIpc(
  db: DatabaseSync,
  libraryRepo: LibraryRepository,
  settingsRepo: SettingsRepository,
  readingListRepo: ReadingListRepository,
  decoder: DecoderClient,
): void {
  ipcMain.handle(DATA_CHANNELS.export, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.SaveDialogOptions = {
      title: t('dialogs:exportData'),
      defaultPath: exportFileName(new Date()),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const { canceled, filePath } = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options);
    if (canceled || !filePath) {
      return null;
    }

    const data = buildExport(libraryRepo, settingsRepo, readingListRepo);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  });

  ipcMain.handle(DATA_CHANNELS.import, async (event): Promise<ImportResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:importData'),
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
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
      void decoder.rebuildThumbnails(libraryRepo.list().map((entry) => entry.path)).catch(() => undefined);
      return { status: 'imported', filePath: filePaths[0], ...counts };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(DATA_CHANNELS.clearLibrary, async (): Promise<ClearLibraryResult> => {
    const readingLists = readingListRepo.clear();
    const entries = libraryRepo.clear();
    // Every thumbnail now belongs to a book that is no longer in the library.
    await decoder.pruneThumbnails([]);
    return { entries, readingLists };
  });
}

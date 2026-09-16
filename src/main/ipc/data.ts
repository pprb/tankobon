import { BrowserWindow, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';

import type { ImportResult } from '../../shared/data';
import { buildExport } from '../db/export-service';
import { applyImport, parseExport } from '../db/import-service';
import type { LibraryRepository } from '../db/library-repository';
import type { SettingsRepository } from '../db/settings-repository';

// Channel names are shared with preload.ts: keep them in sync.
export const DATA_CHANNELS = {
  export: 'data:export',
  import: 'data:import',
} as const;

export function registerDataIpc(libraryRepo: LibraryRepository, settingsRepo: SettingsRepository): void {
  ipcMain.handle(DATA_CHANNELS.export, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.SaveDialogOptions = {
      title: 'Exporter les données',
      defaultPath: `tankobon-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    const { canceled, filePath } = window
      ? await dialog.showSaveDialog(window, options)
      : await dialog.showSaveDialog(options);
    if (canceled || !filePath) {
      return null;
    }

    const data = buildExport(libraryRepo, settingsRepo);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  });

  ipcMain.handle(DATA_CHANNELS.import, async (event): Promise<ImportResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Importer des données',
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
      return { status: 'imported', filePath: filePaths[0], ...applyImport(libraryRepo, settingsRepo, data) };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  });
}

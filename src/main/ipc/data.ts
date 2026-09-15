import { BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';

import { buildExport } from '../db/export-service';
import type { LibraryRepository } from '../db/library-repository';
import type { SettingsRepository } from '../db/settings-repository';

// Channel names are shared with preload.ts: keep them in sync.
export const DATA_CHANNELS = {
  export: 'data:export',
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
}

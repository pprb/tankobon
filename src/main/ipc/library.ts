import { BrowserWindow, dialog, ipcMain } from 'electron';

import type { ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';

// Channel names are shared with preload.ts: keep them in sync.
export const LIBRARY_CHANNELS = {
  list: 'library:list',
  addFolder: 'library:add-folder',
  /** Main → renderer, while `addFolder` runs. */
  scanProgress: 'library:scan-progress',
  remove: 'library:remove',
  updateProgress: 'library:update-progress',
  updateRating: 'library:update-rating',
  updateTags: 'library:update-tags',
} as const;

export function registerLibraryIpc(repo: LibraryRepository): void {
  ipcMain.handle(LIBRARY_CHANNELS.list, () => repo.list());

  ipcMain.handle(LIBRARY_CHANNELS.addFolder, async (event): Promise<ScanResult> => {
    const options: Electron.OpenDialogOptions = {
      title: 'Ajouter un dossier de BD',
      properties: ['openDirectory'],
    };
    const window = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const directory = filePaths[0];
    const summary = await scanIntoLibrary(repo, directory, (progress) => {
      // The renderer may be gone (window closed mid-scan); dropping the update is enough.
      if (!event.sender.isDestroyed()) {
        event.sender.send(LIBRARY_CHANNELS.scanProgress, progress);
      }
    });
    return { status: 'ok', directory, ...summary };
  });

  ipcMain.handle(LIBRARY_CHANNELS.remove, (_event, id: string) => repo.remove(id));

  ipcMain.handle(LIBRARY_CHANNELS.updateProgress, (_event, id: string, currentPage: number) =>
    repo.updateProgress(id, currentPage),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateRating, (_event, id: string, rating: number) =>
    repo.updateRating(id, rating),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateTags, (_event, id: string, tags: string[]) => repo.updateTags(id, tags));
}

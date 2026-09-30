import { BrowserWindow, app, dialog, ipcMain } from 'electron';

import type { DatabaseLocation, DatabaseLocationResult } from '../../shared/data';
import { databaseLocation } from '../db/database';
import { checkDirectoryUsable, writeLocationPointer } from '../db/db-location';

// Channel names are shared with preload.ts: keep them in sync.
export const DATABASE_CHANNELS = {
  getLocation: 'database:get-location',
  chooseLocation: 'database:choose-location',
  resetLocation: 'database:reset-location',
  relaunch: 'database:relaunch',
} as const;

/**
 * Changing the location only rewrites the pointer file: the database already open stays open, and
 * the new one is picked up on the next start. Moving the existing file is deliberately not done —
 * pointing at a directory that already holds a `tankobon.db` (a synced folder, another machine)
 * has to keep that database rather than overwrite it.
 */
export function registerDatabaseIpc(): void {
  ipcMain.handle(DATABASE_CHANNELS.getLocation, (): DatabaseLocation => databaseLocation());

  ipcMain.handle(DATABASE_CHANNELS.chooseLocation, async (event): Promise<DatabaseLocationResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Choisir le dossier de la base de données',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: databaseLocation().directory,
    };
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const directory = filePaths[0];
    const problem = checkDirectoryUsable(directory);
    if (problem) {
      return { status: 'error', message: problem };
    }

    writeLocationPointer(app.getPath('userData'), directory);
    return { status: 'changed', location: databaseLocation() };
  });

  ipcMain.handle(DATABASE_CHANNELS.resetLocation, (): DatabaseLocation => {
    writeLocationPointer(app.getPath('userData'), null);
    return databaseLocation();
  });

  ipcMain.handle(DATABASE_CHANNELS.relaunch, () => {
    app.relaunch();
    // `quit` (not `exit`) so main.ts's `will-quit` still closes the database cleanly.
    app.quit();
  });
}

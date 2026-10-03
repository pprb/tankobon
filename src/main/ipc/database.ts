import { BrowserWindow, app, dialog } from 'electron';

import type { DatabaseLocation, DatabaseLocationResult } from '../../shared/data';
import { t } from '../../shared/i18n';
import { tuple } from '../../shared/validation';
import { databaseLocation } from '../db/database';
import { checkDirectoryUsable, writeLocationPointer } from '../db/db-location';
import { handle } from './handle';

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
  handle(DATABASE_CHANNELS.getLocation, tuple(), (): DatabaseLocation => databaseLocation());

  handle(DATABASE_CHANNELS.chooseLocation, tuple(), async (event): Promise<DatabaseLocationResult> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:chooseDatabaseFolder'),
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

  handle(DATABASE_CHANNELS.resetLocation, tuple(), (): DatabaseLocation => {
    writeLocationPointer(app.getPath('userData'), null);
    return databaseLocation();
  });

  handle(DATABASE_CHANNELS.relaunch, tuple(), () => {
    app.relaunch();
    // `quit` (not `exit`) so main.ts's `will-quit` still closes the database cleanly.
    app.quit();
  });
}

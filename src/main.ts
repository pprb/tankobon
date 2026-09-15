import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { openDatabase } from './main/db/database';
import { LibraryRepository } from './main/db/library-repository';
import { SettingsRepository } from './main/db/settings-repository';
import { registerComicIpc } from './main/ipc/comic';
import { registerDataIpc } from './main/ipc/data';
import { registerLibraryIpc } from './main/ipc/library';
import { registerSettingsIpc } from './main/ipc/settings';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const isDev = !app.isPackaged;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Tankōbon',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

app.whenReady().then(() => {
  const db = openDatabase();
  const libraryRepo = new LibraryRepository(db);
  const settingsRepo = new SettingsRepository(db);

  registerLibraryIpc(libraryRepo);
  registerSettingsIpc(settingsRepo);
  registerDataIpc(libraryRepo, settingsRepo);
  registerComicIpc(libraryRepo);

  app.on('will-quit', () => db.close());

  createWindow();
});

// Quit when all windows are closed, except on macOS where apps stay active
// until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create a window when the dock icon is clicked and no window is open.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

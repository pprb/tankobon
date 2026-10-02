import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

import { openDatabase } from './main/db/database';
import { LibraryRepository } from './main/db/library-repository';
import { ReadingListRepository } from './main/db/reading-list-repository';
import { SettingsRepository } from './main/db/settings-repository';
import { registerAppIpc } from './main/ipc/app';
import { registerComicIpc } from './main/ipc/comic';
import { registerDatabaseIpc } from './main/ipc/database';
import { registerDataIpc } from './main/ipc/data';
import { registerLibraryIpc } from './main/ipc/library';
import { registerMetadataIpc } from './main/ipc/metadata';
import { registerReadingListIpc } from './main/ipc/reading-lists';
import { registerSettingsIpc } from './main/ipc/settings';
import { applyMainLanguage } from './main/language';
import { ThumbnailCache } from './main/services/thumbnail-cache';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Development mode (`npm run dev`, see forge.config.ts): only there are DevTools opened.
const isDevMode = !app.isPackaged && process.env.TANKOBON_DEV === '1';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Tankōbon',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The window only ever shows the app itself: no navigation away from it (a dropped file or a
  // clicked link would replace the UI, and a page loaded there could reach `window.tankobon`),
  // and no new window. Links go through `app:open-link` instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (isDevMode) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

app.whenReady().then(() => {
  const db = openDatabase();
  const libraryRepo = new LibraryRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const readingListRepo = new ReadingListRepository(db);
  // Before anything can show a dialog or return an error message.
  applyMainLanguage(settingsRepo.getAll().language);
  // A cache, so it stays in userData even when the database lives elsewhere: it is rebuilt from the files.
  const thumbnails = new ThumbnailCache(path.join(app.getPath('userData'), 'thumbnails'));
  // Leftovers of another database (its location changed) or of a crash between two writes.
  void thumbnails.prune(libraryRepo.list().map((entry) => entry.path));

  registerLibraryIpc(libraryRepo, thumbnails);
  registerReadingListIpc(readingListRepo);
  registerSettingsIpc(settingsRepo);
  registerDataIpc(libraryRepo, settingsRepo, readingListRepo, thumbnails);
  registerComicIpc(libraryRepo, thumbnails);
  registerDatabaseIpc();
  registerMetadataIpc(settingsRepo);
  registerAppIpc();

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

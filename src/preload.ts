// Preload script: the only bridge between the renderer and the main process.
// Expose a minimal, explicit API via contextBridge — never the raw ipcRenderer.
// See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

import type { ComicInfo, ComicPage } from './shared/comic';
import type { DatabaseLocation, DatabaseLocationResult, ImportResult } from './shared/data';
import type { LibraryEntry } from './shared/library';
import type { AppSettings } from './shared/settings';

// Mirror of the CHANNELS constants in main/ipc/*.ts (preload cannot import main code).
const api = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  comic: {
    /** Opens a native file picker; resolves to the chosen path, or null if cancelled. */
    pickFile: (): Promise<string | null> => ipcRenderer.invoke('comic:pick-file'),
    open: (filePath: string): Promise<ComicInfo> => ipcRenderer.invoke('comic:open', filePath),
    readPage: (id: string, index: number): Promise<ComicPage> =>
      ipcRenderer.invoke('comic:read-page', id, index),
    close: (id: string): Promise<void> => ipcRenderer.invoke('comic:close', id),
  },
  library: {
    list: (): Promise<LibraryEntry[]> => ipcRenderer.invoke('library:list'),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('library:remove', id),
    updateProgress: (id: string, currentPage: number): Promise<void> =>
      ipcRenderer.invoke('library:update-progress', id, currentPage),
    updateRating: (id: string, rating: number): Promise<void> =>
      ipcRenderer.invoke('library:update-rating', id, rating),
    updateTags: (id: string, tags: string[]): Promise<void> => ipcRenderer.invoke('library:update-tags', id, tags),
  },
  settings: {
    getAll: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get-all'),
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
  },
  data: {
    /** Opens a native save dialog and writes a JSON export there; resolves to the chosen path, or null if cancelled. */
    export: (): Promise<string | null> => ipcRenderer.invoke('data:export'),
    /** Opens a native file picker and merges the chosen JSON export into the local database. */
    import: (): Promise<ImportResult> => ipcRenderer.invoke('data:import'),
  },
  database: {
    /** Where the database file currently lives. */
    getLocation: (): Promise<DatabaseLocation> => ipcRenderer.invoke('database:get-location'),
    /** Opens a native directory picker; the new location only takes effect on the next start. */
    chooseLocation: (): Promise<DatabaseLocationResult> => ipcRenderer.invoke('database:choose-location'),
    resetLocation: (): Promise<DatabaseLocation> => ipcRenderer.invoke('database:reset-location'),
    /** Restarts the app, e.g. to open the database from its new location. */
    relaunch: (): Promise<void> => ipcRenderer.invoke('database:relaunch'),
  },
};

export type TankobonApi = typeof api;

contextBridge.exposeInMainWorld('tankobon', api);

/**
 * Preload script: the only bridge between the renderer and the main process.
 * Expose a minimal, explicit API via contextBridge — never the raw ipcRenderer.
 * See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 * @module
 */
import { contextBridge, ipcRenderer } from 'electron';

import type { ComicInfo, ComicPage } from './shared/comic';
import type { DatabaseLocation, DatabaseLocationResult, ImportResult } from './shared/data';
import type { LibraryEntry, MetadataUpdate, ScanProgress, ScanResult } from './shared/library';
import type { MetadataQuery, MetadataSearchResult } from './shared/metadata';
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
    /** Opens a comic and registers it in the library (or refreshes its entry); resolves with its saved page. */
    open: (filePath: string): Promise<ComicInfo> => ipcRenderer.invoke('comic:open', filePath),
    /** Reads one page (0-based) of a comic opened with `open`, as image bytes. */
    readPage: (id: string, index: number): Promise<ComicPage> =>
      ipcRenderer.invoke('comic:read-page', id, index),
    /** Closes a comic opened with `open`, releasing its archive in the main process. */
    close: (id: string): Promise<void> => ipcRenderer.invoke('comic:close', id),
  },
  library: {
    /** Every library entry, most recently opened first. */
    list: (): Promise<LibraryEntry[]> => ipcRenderer.invoke('library:list'),
    /** Opens a native directory picker, then adds every comic found under it, recursively. */
    addFolder: (): Promise<ScanResult> => ipcRenderer.invoke('library:add-folder'),
    /** Subscribes to `addFolder`'s progress; returns the unsubscribe function. */
    onScanProgress: (listener: (progress: ScanProgress) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => listener(progress);
      ipcRenderer.on('library:scan-progress', handler);
      return () => {
        ipcRenderer.removeListener('library:scan-progress', handler);
      };
    },
    /** Removes an entry from the library; the file on disk is left untouched. */
    remove: (id: string): Promise<void> => ipcRenderer.invoke('library:remove', id),
    /** Saves the last page read (0-based) of a library entry. */
    updateProgress: (id: string, currentPage: number): Promise<void> =>
      ipcRenderer.invoke('library:update-progress', id, currentPage),
    /** Sets the rating of a library entry: 0 (unrated) to 5. */
    updateRating: (id: string, rating: number): Promise<void> =>
      ipcRenderer.invoke('library:update-rating', id, rating),
    /** Replaces the tags of a library entry. */
    updateTags: (id: string, tags: string[]): Promise<void> => ipcRenderer.invoke('library:update-tags', id, tags),
    /** Writes the given metadata fields (title, series, credits…) of a library entry; resolves with the updated entry, or null if it is gone. */
    updateMetadata: (id: string, update: MetadataUpdate): Promise<LibraryEntry | null> =>
      ipcRenderer.invoke('library:update-metadata', id, update),
  },
  metadata: {
    /** Looks a book up in the public APIs enabled in the settings (Comic Vine, Google Books). */
    search: (query: MetadataQuery): Promise<MetadataSearchResult> => ipcRenderer.invoke('metadata:search', query),
  },
  settings: {
    /** Every setting, with defaults for the ones never stored. */
    getAll: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get-all'),
    /** Stores one setting. */
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
    /** Points the app back at the default location; takes effect on the next start. */
    resetLocation: (): Promise<DatabaseLocation> => ipcRenderer.invoke('database:reset-location'),
    /** Restarts the app, e.g. to open the database from its new location. */
    relaunch: (): Promise<void> => ipcRenderer.invoke('database:relaunch'),
  },
};

/** Type of the `window.tankobon` object the renderer uses to reach the main process. */
export type TankobonApi = typeof api;

contextBridge.exposeInMainWorld('tankobon', api);

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
import type { MetadataPageResult, MetadataQuery, MetadataSearchResult } from './shared/metadata';
import type { AppSettings } from './shared/settings';

/** Versions of the runtimes the app is running on, as `window.tankobon.versions`. */
export interface RuntimeVersions {
  /** Electron version. */
  electron: string;
  /** Chromium version. */
  chrome: string;
  /** Node.js version of the main process. */
  node: string;
}

/** Opening and reading comics, as `window.tankobon.comic`. */
export interface ComicApi {
  /** Opens a native file picker; resolves to the chosen path, or null if cancelled. */
  pickFile(): Promise<string | null>;
  /** Opens a comic and registers it in the library (or refreshes its entry); resolves with its saved page. */
  open(filePath: string): Promise<ComicInfo>;
  /** Reads one page (0-based) of a comic opened with `open`, as image bytes. */
  readPage(id: string, index: number): Promise<ComicPage>;
  /** Closes a comic opened with `open`, releasing its archive in the main process. */
  close(id: string): Promise<void>;
}

/** The library and its per-entry fields, as `window.tankobon.library`. */
export interface LibraryApi {
  /** Every library entry, most recently opened first. */
  list(): Promise<LibraryEntry[]>;
  /** Opens a native directory picker, then adds every comic found under it, recursively. */
  addFolder(): Promise<ScanResult>;
  /** Subscribes to `addFolder`'s progress; returns the unsubscribe function. */
  onScanProgress(listener: (progress: ScanProgress) => void): () => void;
  /** Removes an entry from the library; the file on disk is left untouched. */
  remove(id: string): Promise<void>;
  /** Saves the last page read (0-based) of a library entry. */
  updateProgress(id: string, currentPage: number): Promise<void>;
  /** Sets the rating of a library entry: 0 (unrated) to 5. */
  updateRating(id: string, rating: number): Promise<void>;
  /** Replaces the tags of a library entry. */
  updateTags(id: string, tags: string[]): Promise<void>;
  /** Writes the given metadata fields (title, series, credits…) of a library entry; resolves with the updated entry, or null if it is gone. */
  updateMetadata(id: string, update: MetadataUpdate): Promise<LibraryEntry | null>;
  /** Cover thumbnail (first page, shrunk) of a library entry as WebP bytes, generated and cached first when missing; null if the entry is unknown or unreadable. */
  thumbnail(id: string): Promise<Uint8Array<ArrayBuffer> | null>;
}

/** Book information lookups in public APIs, as `window.tankobon.metadata`. */
export interface MetadataApi {
  /** Looks a book up in the public APIs enabled in the settings (Comic Vine, Google Books). */
  search(query: MetadataQuery): Promise<MetadataSearchResult>;
  /** Reads a book from the Bédéthèque album page at `url`, a link the user pasted. */
  fromPage(url: string): Promise<MetadataPageResult>;
}

/** The user's settings, as `window.tankobon.settings`. */
export interface SettingsApi {
  /** Every setting, with defaults for the ones never stored. */
  getAll(): Promise<AppSettings>;
  /** Stores one setting. */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
}

/** JSON export and import of the library and settings, as `window.tankobon.data`. */
export interface DataApi {
  /** Opens a native save dialog and writes a JSON export there; resolves to the chosen path, or null if cancelled. */
  export(): Promise<string | null>;
  /** Opens a native file picker and merges the chosen JSON export into the local database. */
  import(): Promise<ImportResult>;
}

/** Where the database file lives, as `window.tankobon.database`. */
export interface DatabaseApi {
  /** Where the database file currently lives. */
  getLocation(): Promise<DatabaseLocation>;
  /** Opens a native directory picker; the new location only takes effect on the next start. */
  chooseLocation(): Promise<DatabaseLocationResult>;
  /** Points the app back at the default location; takes effect on the next start. */
  resetLocation(): Promise<DatabaseLocation>;
  /** Restarts the app, e.g. to open the database from its new location. */
  relaunch(): Promise<void>;
}

/**
 * Type of the `window.tankobon` object the renderer uses to reach the main process (see
 * `src/global.d.ts`), one member per area. Each method maps to one IPC channel, listed in the
 * generated IPC reference.
 */
export interface TankobonApi {
  /** Runtime versions, read once when the preload runs. */
  versions: RuntimeVersions;
  /** Opening and reading comics. */
  comic: ComicApi;
  /** The library and its per-entry fields. */
  library: LibraryApi;
  /** The user's settings. */
  settings: SettingsApi;
  /** JSON export and import. */
  data: DataApi;
  /** Location of the database file. */
  database: DatabaseApi;
  /** Book information lookups. */
  metadata: MetadataApi;
}

// Mirror of the CHANNELS constants in main/ipc/*.ts (preload cannot import main code). The method
// descriptions live on the interfaces above, where TypeDoc and the IPC reference read them.
const api: TankobonApi = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  comic: {
    pickFile: () => ipcRenderer.invoke('comic:pick-file'),
    open: (filePath) => ipcRenderer.invoke('comic:open', filePath),
    readPage: (id, index) => ipcRenderer.invoke('comic:read-page', id, index),
    close: (id) => ipcRenderer.invoke('comic:close', id),
  },
  library: {
    list: () => ipcRenderer.invoke('library:list'),
    addFolder: () => ipcRenderer.invoke('library:add-folder'),
    onScanProgress: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => listener(progress);
      ipcRenderer.on('library:scan-progress', handler);
      return () => {
        ipcRenderer.removeListener('library:scan-progress', handler);
      };
    },
    remove: (id) => ipcRenderer.invoke('library:remove', id),
    updateProgress: (id, currentPage) => ipcRenderer.invoke('library:update-progress', id, currentPage),
    updateRating: (id, rating) => ipcRenderer.invoke('library:update-rating', id, rating),
    updateTags: (id, tags) => ipcRenderer.invoke('library:update-tags', id, tags),
    updateMetadata: (id, update) => ipcRenderer.invoke('library:update-metadata', id, update),
    thumbnail: (id) => ipcRenderer.invoke('library:thumbnail', id),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import'),
  },
  database: {
    getLocation: () => ipcRenderer.invoke('database:get-location'),
    chooseLocation: () => ipcRenderer.invoke('database:choose-location'),
    resetLocation: () => ipcRenderer.invoke('database:reset-location'),
    relaunch: () => ipcRenderer.invoke('database:relaunch'),
  },
  metadata: {
    search: (query) => ipcRenderer.invoke('metadata:search', query),
    fromPage: (url) => ipcRenderer.invoke('metadata:from-page', url),
  },
};

contextBridge.exposeInMainWorld('tankobon', api);

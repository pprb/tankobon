/**
 * Preload script: the only bridge between the renderer and the main process.
 * Expose a minimal, explicit API via contextBridge — never the raw ipcRenderer.
 * See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
 * @module
 */
import { contextBridge, ipcRenderer } from 'electron';

import type { AppInfo, AppLink } from './shared/app';
import type { ComicPage, OpenComicResult } from './shared/comic';
import type { DataChange } from './shared/data-changes';
import type {
  ClearLibraryResult,
  DatabaseLocation,
  DatabaseLocationResult,
  ExportResult,
  ImportResult,
} from './shared/data';
import type { AddFileResult, LibraryEntry, MetadataUpdate, ScanProgress, ScanResult } from './shared/library';
import type { MetadataPageResult, MetadataQuery, MetadataSearchResult } from './shared/metadata';
import type { ReadingList, ReadingListOrderResult, ReadingListResult } from './shared/reading-list';
import type { ApiKeys, AppSettings, PublicSettings } from './shared/settings';

/** The app itself (versions, OS languages, project links), as `window.tankobon.app`. */
export interface AppApi {
  /** Versions of the app, Electron, Chromium, Node.js and V8, and the OS and CPU architecture. */
  getInfo(): Promise<AppInfo>;
  /** The OS's preferred languages (BCP 47 tags, most preferred first), to resolve the `system` language setting as the main process does. */
  getSystemLanguages(): Promise<string[]>;
  /** Opens one of the project's pages (repository, documentation…) in the default browser. */
  openLink(link: AppLink): Promise<void>;
}

/** Opening and reading comics, as `window.tankobon.comic`. */
export interface ComicApi {
  /** Opens a native file picker; resolves to an opaque token for the chosen file (to pass to `open`), or null if cancelled. The renderer never learns the path. */
  pickFile(): Promise<string | null>;
  /** Opens a comic and registers it in the library (or refreshes its entry); resolves with its saved page.
   * `ref` is a library entry id or a token from `pickFile`, never a path. A file that can't be opened (moved, deleted, corrupted, unsupported) resolves to an error result
   * with a message in the interface language, rather than rejecting.
   */
  open(ref: string): Promise<OpenComicResult>;
  /** Reads one page (0-based) of a comic opened with `open`, as image bytes. */
  readPage(id: string, index: number): Promise<ComicPage>;
  /** Closes a comic opened with `open`, releasing its archive in the main process. */
  close(id: string): Promise<void>;
}

/** The library and its per-entry fields, as `window.tankobon.library`. */
export interface LibraryApi {
  /** Every library entry, most recently opened first. */
  list(): Promise<LibraryEntry[]>;
  /** Opens a native file picker, then adds the chosen comic to the library without opening it; an unreadable file resolves to an error result rather than rejecting. */
  addFile(): Promise<AddFileResult>;
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

/** Reading lists (ordered piles of library entries), as `window.tankobon.readingLists`. */
export interface ReadingListApi {
  /** Every reading list, in the user's order (new lists last), each with its library entry ids in reading order. */
  list(): Promise<ReadingList[]>;
  /** Creates an empty reading list; refused when the name is empty. */
  create(name: string): Promise<ReadingListResult>;
  /** Renames a reading list; refused when the name is empty. */
  rename(id: string, name: string): Promise<ReadingListResult>;
  /** Deletes a reading list; its books stay in the library. */
  remove(id: string): Promise<void>;
  /** Appends a library entry to a reading list; refused when the list already holds 50 books. */
  addEntry(id: string, libraryId: string): Promise<ReadingListResult>;
  /** Takes a library entry out of a reading list. */
  removeEntry(id: string, libraryId: string): Promise<ReadingListResult>;
  /** Stores a new order for a reading list; `entryIds` must hold exactly the list's current entries. */
  reorder(id: string, entryIds: string[]): Promise<ReadingListResult>;
  /** Stores a new order for the reading lists themselves; `listIds` must hold exactly the current lists. */
  reorderLists(listIds: string[]): Promise<ReadingListOrderResult>;
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
  /** Every setting except the API keys, with defaults for the ones never stored. */
  getAll(): Promise<PublicSettings>;
  /** The metadata sources' API keys, kept out of `getAll()` so only the page that edits them loads them. */
  getApiKeys(): Promise<ApiKeys>;
  /** Stores one setting; the main process refuses an unknown key or a value its validator rejects. */
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
}

/** JSON export and import of the library and settings, and clearing the library, as `window.tankobon.data`. */
export interface DataApi {
  /** Opens a native save dialog and writes a JSON export there; an error (full or read-only disk…) comes back as a result, not a rejection. */
  export(): Promise<ExportResult>;
  /** Opens a native file picker and merges the chosen JSON export into the local database. */
  import(): Promise<ImportResult>;
  /** Empties the library (entries, credits, people) and deletes every reading list and cover thumbnail; the comic files and the settings are left untouched. A failure comes back as an error result. */
  clearLibrary(): Promise<ClearLibraryResult>;
  /** Subscribes to the main process's `data:changed` push, sent after every database write (library, reading lists, settings); returns the unsubscribe function. */
  onChanged(listener: (change: DataChange) => void): () => void;
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
  /** The app itself: versions, OS languages and project links. */
  app: AppApi;
  /** Opening and reading comics. */
  comic: ComicApi;
  /** The library and its per-entry fields. */
  library: LibraryApi;
  /** Reading lists. */
  readingLists: ReadingListApi;
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
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    getSystemLanguages: () => ipcRenderer.invoke('app:get-system-languages'),
    openLink: (link) => ipcRenderer.invoke('app:open-link', link),
  },
  comic: {
    pickFile: () => ipcRenderer.invoke('comic:pick-file'),
    open: (filePath) => ipcRenderer.invoke('comic:open', filePath),
    readPage: (id, index) => ipcRenderer.invoke('comic:read-page', id, index),
    close: (id) => ipcRenderer.invoke('comic:close', id),
  },
  library: {
    list: () => ipcRenderer.invoke('library:list'),
    addFile: () => ipcRenderer.invoke('library:add-file'),
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
  readingLists: {
    list: () => ipcRenderer.invoke('reading-lists:list'),
    create: (name) => ipcRenderer.invoke('reading-lists:create', name),
    rename: (id, name) => ipcRenderer.invoke('reading-lists:rename', id, name),
    remove: (id) => ipcRenderer.invoke('reading-lists:remove', id),
    addEntry: (id, libraryId) => ipcRenderer.invoke('reading-lists:add-entry', id, libraryId),
    removeEntry: (id, libraryId) => ipcRenderer.invoke('reading-lists:remove-entry', id, libraryId),
    reorder: (id, entryIds) => ipcRenderer.invoke('reading-lists:reorder', id, entryIds),
    reorderLists: (listIds) => ipcRenderer.invoke('reading-lists:reorder-lists', listIds),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    getApiKeys: () => ipcRenderer.invoke('settings:get-api-keys'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import'),
    clearLibrary: () => ipcRenderer.invoke('data:clear-library'),
    onChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, change: DataChange) => listener(change);
      ipcRenderer.on('data:changed', handler);
      return () => {
        ipcRenderer.removeListener('data:changed', handler);
      };
    },
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

// Preload script: the only bridge between the renderer and the main process.
// Expose a minimal, explicit API via contextBridge — never the raw ipcRenderer.
// See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

import type { ComicInfo, ComicPage } from './shared/comic';

// Mirror of COMIC_CHANNELS in main/ipc/comic.ts (preload cannot import main code).
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
};

export type TankobonApi = typeof api;

contextBridge.exposeInMainWorld('tankobon', api);

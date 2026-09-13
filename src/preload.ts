// Preload script: the only bridge between the renderer and the main process.
// Expose a minimal, explicit API via contextBridge — never the raw ipcRenderer.
// See https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge } from 'electron';

const api = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
};

export type TankobonApi = typeof api;

contextBridge.exposeInMainWorld('tankobon', api);

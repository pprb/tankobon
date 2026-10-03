import { BrowserWindow } from 'electron';

import type { DataChange } from '../../shared/data-changes';

// Channel name is shared with preload.ts: keep them in sync.
export const DATA_CHANGE_CHANNELS = {
  /** Main → renderer, after every database write. */
  changed: 'data:changed',
} as const;

/** Tells the IPC handlers' owners how to announce a write: see {@link broadcastDataChange}. */
export type NotifyDataChange = (change: DataChange) => void;

/**
 * Sends a change to every open window. Handlers call it right after writing, so the renderer's
 * store never has to guess which views are affected. A window being closed is skipped.
 */
export const broadcastDataChange: NotifyDataChange = (change) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(DATA_CHANGE_CHANNELS.changed, change);
    }
  }
};

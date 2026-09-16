// Types shared between the main process and the renderer (via preload).

/**
 * Outcome of importing a previously exported JSON snapshot. Validation failures are part of the
 * result rather than a thrown error: an `ipcMain.handle` rejection reaches the renderer wrapped
 * in "Error invoking remote method …", which is not something to show the user.
 */
export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'imported'; filePath: string; added: number; updated: number }
  | { status: 'error'; message: string };

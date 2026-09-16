// Types shared between the main process and the renderer (via preload).

/**
 * Outcome of importing a previously exported JSON snapshot. Validation failures are part of the
 * result rather than a thrown error: an `ipcMain.handle` rejection reaches the renderer wrapped
 * in "Error invoking remote method …", which is not something to show the user.
 */
/** Where the SQLite database file currently lives. */
export interface DatabaseLocation {
  /** Directory holding the database file. */
  directory: string;
  /** Full path of the database file itself, for display. */
  filePath: string;
  /** Whether that's Electron's `userData` directory, i.e. the app's default location. */
  isDefault: boolean;
}

/** Outcome of picking a new directory for the database. Same rationale as `ImportResult`. */
export type DatabaseLocationResult =
  | { status: 'cancelled' }
  | { status: 'changed'; location: DatabaseLocation }
  | { status: 'error'; message: string };

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'imported'; filePath: string; added: number; updated: number }
  | { status: 'error'; message: string };

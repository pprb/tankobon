// Types shared between the main process and the renderer (via preload).

/** A comic registered in the local library database. */
export interface LibraryEntry {
  id: string;
  /** Absolute path on disk. */
  path: string;
  title: string;
  pageCount: number;
  /** Last page read, for resuming where the user left off. */
  currentPage: number;
  /** ISO timestamps. */
  addedAt: string;
  lastOpenedAt: string;
}

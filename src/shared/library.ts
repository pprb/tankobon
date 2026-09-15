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
  /** Total entries in the archive (not just image pages). */
  fileCount: number;
  /** Size in bytes of the archive file on disk. */
  fileSize: number;
  /** User rating, 0 (unrated) to 5. */
  rating: number;
  /** Free-form user labels, e.g. "Lu", "À lire". */
  tags: string[];
}

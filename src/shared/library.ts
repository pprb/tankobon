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

/** Progress of a folder scan, pushed from the main process while it runs. */
export interface ScanProgress {
  /** `scanning`: walking the tree, `total` not known yet. `importing`: opening each file found. */
  phase: 'scanning' | 'importing' | 'done';
  processed: number;
  total: number;
  /** Absolute path currently being handled, for the progress label. */
  currentFile: string;
}

/** Outcome of `library.addFolder()`. */
export type ScanResult =
  | { status: 'cancelled' }
  | {
      status: 'ok';
      directory: string;
      /** Comics added to the library. */
      added: number;
      /** Comics already in the library, left untouched. */
      skipped: number;
      /** Files that couldn't be opened (corrupt, unsupported variant…). */
      failed: number;
      /** Supported files found in the tree, i.e. `added + skipped + failed`. */
      total: number;
    };

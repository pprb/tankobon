/**
 * Library types shared between the main process and the renderer (via preload).
 * @module
 */

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
  /**
   * Whether `title` was set by the user (accepted from a metadata lookup or typed in the edit form)
   * rather than derived from the file name. A locked title survives reopening the file, which
   * otherwise refreshes it.
   */
  titleLocked: boolean;
  /** Series the book belongs to ("Tintin", "X-Men"), null when unknown or a one-shot. */
  series: string | null;
  /** Volume or issue number within `series`, as text ("3", "12.1", "HS"). Null for one-shots. */
  volume: string | null;
  /** Release date as precise as known: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  releaseDate: string | null;
  /** Language of the book, as an ISO 639-1 code ("fr", "en"). */
  language: string | null;
  /** People credited on the book, with their role. */
  credits: Credit[];
}

/**
 * What a person did on a book. `author` is for sources that don't say (Google Books lists
 * "authors" without telling the writer from the artist).
 */
export type CreditRole = 'writer' | 'artist' | 'colorist' | 'inker' | 'letterer' | 'cover' | 'author';

/** Every `CreditRole`, in display order. */
export const CREDIT_ROLES: readonly CreditRole[] = [
  'writer',
  'artist',
  'colorist',
  'inker',
  'letterer',
  'cover',
  'author',
];

/** A person, as identified by name. `firstName` is empty for a single-word name or pen name ("Hergé"). */
export interface PersonName {
  firstName: string;
  lastName: string;
}

/** A person credited on a book: one row of the `credits` table joined with `people`. */
export interface Credit extends PersonName {
  /** Id of the row in the `people` table; the same person shares it across books. */
  personId: string;
  role: CreditRole;
}

/** A credit as written by `library.updateMetadata()`: people are matched (or created) by name. */
export interface CreditInput extends PersonName {
  role: CreditRole;
}

/**
 * Metadata fields to write on a library entry with `library.updateMetadata()`. Only the fields
 * present are changed; `credits`, when present, replaces the entry's whole credit list.
 */
export interface MetadataUpdate {
  /** Replaces the title and locks it (see `LibraryEntry.titleLocked`). */
  title?: string;
  series?: string | null;
  volume?: string | null;
  releaseDate?: string | null;
  language?: string | null;
  credits?: CreditInput[];
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

/** Outcome of `library.resync()`. */
export type ResyncResult =
  | {
      status: 'ok';
      /** Comics added to the library. */
      added: number;
      /** Comics removed because their file no longer exists. */
      removed: number;
      /** Files that couldn't be opened. */
      failed: number;
      /** Folders that couldn't be read, left untouched. */
      unreachable: number;
      /** When it finished (ISO 8601); also stored as the `lastResyncAt` setting. */
      finishedAt: string;
    }
  | { status: 'error'; message: string };

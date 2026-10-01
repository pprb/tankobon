/**
 * Comic types shared between the main process and the renderer (via preload).
 * @module
 */

/** What `ComicService` knows about an opened archive, before it is matched to a library entry. */
export interface ArchiveInfo {
  /** Opaque handle to the archive, valid until `closeComic`. */
  id: string;
  /** Absolute path on disk. */
  path: string;
  /** File name without extension; in `ComicInfo`, the library title (which the user may have changed). */
  title: string;
  /** Page count (image entries only, sorted in reading order). */
  pageCount: number;
  /** Total entries in the archive (not just image pages). */
  fileCount: number;
}

/** What `comic:open` resolves to: the opened archive merged with its library entry. */
export interface ComicInfo extends ArchiveInfo {
  /** Id of the matching entry in the library database. */
  libraryId: string;
  /** Page to resume reading at, from the library database. */
  resumePage: number;
}

/** One page, as returned by `comic:read-page`. */
export interface ComicPage {
  /** Raw image bytes. */
  data: Uint8Array<ArrayBuffer>;
  /** MIME type inferred from the entry extension. */
  mimeType: string;
}

/** Extensions (without the dot) the app can open: used by the file dialog filter and the folder scanner. */
export const SUPPORTED_COMIC_EXTENSIONS = ['cbz', 'cbr', 'pdf'] as const;

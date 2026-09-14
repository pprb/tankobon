// Types shared between the main process and the renderer (via preload).

export interface ComicInfo {
  /** Opaque handle to the archive, valid until `closeComic`. */
  id: string;
  /** Absolute path on disk. */
  path: string;
  /** File name without extension. */
  title: string;
  /** Page count (image entries only, sorted in reading order). */
  pageCount: number;
}

export interface ComicPage {
  /** Raw image bytes. */
  data: Uint8Array<ArrayBuffer>;
  /** MIME type inferred from the entry extension. */
  mimeType: string;
}

export const SUPPORTED_COMIC_EXTENSIONS = ['cbz'] as const;

/**
 * Metadata lookup types (finding a book's series, volume, authors… in public APIs) shared between
 * the main process and the renderer (via preload).
 * @module
 */
import type { CreditInput } from './library';

/** The public APIs a lookup can query. */
export type MetadataSource = 'comicvine' | 'googlebooks';

/** Display names of the sources, for the UI. */
export const METADATA_SOURCE_LABELS: Record<MetadataSource, string> = {
  comicvine: 'Comic Vine',
  googlebooks: 'Google Books',
};

/** What to look for: free text (usually the series or book title) and an optional volume/issue number. */
export interface MetadataQuery {
  text: string;
  /** Volume or issue number; narrows the Comic Vine search to that issue of the matching series. */
  volume: string | null;
}

/** One book found by a source, normalized to the library's fields. Any field may be unknown. */
export interface MetadataCandidate {
  source: MetadataSource;
  /** The book's id in its source, unique per source. */
  sourceId: string;
  /** Page of the book on the source's website, if it has one. */
  sourceUrl: string | null;
  /** Small cover image URL, to help the user recognize the right book. */
  coverUrl: string | null;
  /** Book title, without the series name and volume when they could be told apart. */
  title: string | null;
  series: string | null;
  volume: string | null;
  /** `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  releaseDate: string | null;
  /** ISO 639-1 code. */
  language: string | null;
  credits: CreditInput[];
}

/**
 * Outcome of `metadata.search()`. A source that fails while another one answers only adds a
 * (French) message to `errors`; `status: 'error'` means no source could be queried at all.
 */
export type MetadataSearchResult =
  | { status: 'ok'; candidates: MetadataCandidate[]; errors: string[] }
  | { status: 'error'; message: string };

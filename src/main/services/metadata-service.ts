/**
 * Metadata lookup across the configured public APIs.
 * @module
 */
import type { MetadataCandidate, MetadataPageResult, MetadataQuery, MetadataSearchResult } from '../../shared/metadata';
import type { AppSettings } from '../../shared/settings';
import { fetchBedethequeAlbum } from './bedetheque';
import { ComicVineClient } from './comic-vine';
import { GoogleBooksClient } from './google-books';
import type { HttpOptions } from './http-json';

/** The settings a lookup needs: which sources are enabled, and their API keys. */
export type SourceSettings = Pick<
  AppSettings,
  'comicVineEnabled' | 'comicVineApiKey' | 'googleBooksEnabled' | 'googleBooksApiKey'
>;

/** A client of one source, as the lookup sees it. */
interface MetadataClient {
  search(query: MetadataQuery): Promise<MetadataCandidate[]>;
}

/**
 * Candidates whose volume is the one asked for come first; otherwise the sources' own order is
 * kept (each source ranks its results by relevance already).
 */
export function rankCandidates(candidates: MetadataCandidate[], query: MetadataQuery): MetadataCandidate[] {
  if (!query.volume) {
    return candidates;
  }
  const matches = (candidate: MetadataCandidate) => candidate.volume?.replace(/^0+(?=\d)/, '') === query.volume;
  return [...candidates.filter(matches), ...candidates.filter((candidate) => !matches(candidate))];
}

/**
 * Queries every enabled source in parallel (Comic Vine only when it has an API key) and merges
 * their results. A failing source only adds its message to `errors`; the result is an error only
 * when no source is configured, the query is empty, or every source failed.
 */
export async function searchMetadata(
  query: MetadataQuery,
  settings: SourceSettings,
  http: HttpOptions,
): Promise<MetadataSearchResult> {
  const text = query.text.trim();
  if (!text) {
    return { status: 'error', message: 'Saisis un titre ou une série à rechercher.' };
  }
  const volume = query.volume?.trim() || null;

  const clients: MetadataClient[] = [];
  if (settings.comicVineEnabled && settings.comicVineApiKey.trim()) {
    clients.push(new ComicVineClient(settings.comicVineApiKey.trim(), http));
  }
  if (settings.googleBooksEnabled) {
    clients.push(new GoogleBooksClient(settings.googleBooksApiKey.trim(), http));
  }
  if (clients.length === 0) {
    return {
      status: 'error',
      message: "Aucune source de métadonnées n'est configurée : active-en une dans Paramètres › Métadonnées.",
    };
  }

  const results = await Promise.allSettled(clients.map((client) => client.search({ text, volume })));
  const candidates = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const errors = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : [],
  );
  if (errors.length === clients.length) {
    return { status: 'error', message: errors.join('\n') };
  }
  return { status: 'ok', candidates: rankCandidates(candidates, { text, volume }), errors };
}

/**
 * Reads a book from the page whose link the user pasted (a Bédéthèque album page, the only kind
 * supported). Needs no setting: pasting the link is the opt-in.
 */
export async function fetchMetadataPage(url: string, http: HttpOptions): Promise<MetadataPageResult> {
  try {
    return { status: 'ok', candidate: await fetchBedethequeAlbum(url, http) };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}

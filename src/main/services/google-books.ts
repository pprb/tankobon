/**
 * Metadata lookup in Google Books, which covers BD and manga editions but doesn't tell a writer
 * from an artist.
 * @module
 */
import type { MetadataCandidate, MetadataQuery } from '../../shared/metadata';
import { splitPersonName, splitSeriesTitle } from '../../shared/title-parsing';
import { getJson, type HttpOptions } from './http-json';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';
const MAX_RESULTS = 10;

/** The part of a Google Books `volumes` item the app reads. */
export interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    language?: string;
    infoLink?: string;
    imageLinks?: { smallThumbnail?: string; thumbnail?: string };
    seriesInfo?: { bookDisplayNumber?: string };
  };
}

/** Google's image links are often `http://`; the renderer would refuse to mix them in. */
function https(url: string | undefined): string | null {
  return url ? url.replace(/^http:\/\//, 'https://') : null;
}

/**
 * Normalizes one Google Books volume. Series and volume number are read from the title when it
 * spells them out ("Astérix - Tome 3 - …"); every author gets the generic `author` role.
 */
export function googleBooksCandidate(volume: GoogleBooksVolume): MetadataCandidate {
  const info = volume.volumeInfo ?? {};
  const fullTitle = [info.title, info.subtitle].filter(Boolean).join(' - ');
  const split = splitSeriesTitle(fullTitle);
  return {
    source: 'googlebooks',
    sourceId: volume.id,
    sourceUrl: https(info.infoLink),
    coverUrl: https(info.imageLinks?.smallThumbnail ?? info.imageLinks?.thumbnail),
    title: split.title || null,
    series: split.series,
    volume: split.volume ?? info.seriesInfo?.bookDisplayNumber ?? null,
    releaseDate: info.publishedDate ?? null,
    language: info.language ?? null,
    credits: (info.authors ?? []).map((name) => ({ ...splitPersonName(name), role: 'author' as const })),
  };
}

/** Searches Google Books, with an API key if the user set one. Throws a translated message on failure. */
export class GoogleBooksClient {
  constructor(
    private readonly apiKey: string,
    private readonly http: HttpOptions,
  ) {}

  /** Full-text search on the query text and volume number. */
  async search(query: MetadataQuery): Promise<MetadataCandidate[]> {
    const params = new URLSearchParams({
      q: query.volume ? `${query.text} ${query.volume}` : query.text,
      maxResults: String(MAX_RESULTS),
      printType: 'books',
    });
    if (this.apiKey) {
      params.set('key', this.apiKey);
    }
    const body = (await getJson(`${BASE_URL}?${params.toString()}`, this.http, 'Google Books')) as {
      items?: GoogleBooksVolume[];
    };
    return (body.items ?? []).map(googleBooksCandidate);
  }
}

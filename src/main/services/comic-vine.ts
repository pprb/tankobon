/**
 * Metadata lookup in Comic Vine (comicvine.gamespot.com), the reference database for US comics.
 * @module
 */
import { t } from '../../shared/i18n';
import type { CreditInput, CreditRole } from '../../shared/library';
import type { MetadataCandidate, MetadataQuery } from '../../shared/metadata';
import { splitPersonName } from '../../shared/title-parsing';
import { getJson, type HttpOptions } from './http-json';

const BASE_URL = 'https://comicvine.gamespot.com/api';
/** Issues whose details (credits) are fetched: one request each, and Comic Vine rate-limits. */
const MAX_RESULTS = 5;
/** Series searched for the requested issue number, best matches first. */
const MAX_VOLUMES = 3;
const ISSUE_FIELDS = 'id,name,issue_number,cover_date,store_date,site_detail_url,image,volume';

interface ComicVineResponse<T> {
  status_code: number;
  error: string;
  results: T;
}

interface ComicVineIssue {
  id: number;
  name: string | null;
  issue_number: string | null;
  cover_date: string | null;
  store_date: string | null;
  site_detail_url: string | null;
  image: { thumb_url?: string; small_url?: string } | null;
  volume: { id: number; name: string } | null;
}

interface ComicVineIssueDetail {
  person_credits?: { name: string; role: string }[];
}

/** Comic Vine's role names (as found, comma-separated, in `person_credits[].role`) mapped to ours. */
const ROLES: Record<string, CreditRole> = {
  writer: 'writer',
  artist: 'artist',
  penciler: 'artist',
  penciller: 'artist',
  inker: 'inker',
  colorist: 'colorist',
  letterer: 'letterer',
  cover: 'cover',
};

/**
 * Turns Comic Vine's `person_credits` into credits: one per person and known role, in the order
 * given; roles we don't track (editor…) are dropped.
 */
export function comicVineCredits(credits: { name: string; role: string }[]): CreditInput[] {
  const result: CreditInput[] = [];
  for (const credit of credits) {
    const roles = new Set(
      credit.role
        .split(',')
        .map((role) => ROLES[role.trim().toLowerCase()])
        .filter((role): role is CreditRole => role !== undefined),
    );
    for (const role of roles) {
      result.push({ ...splitPersonName(credit.name), role });
    }
  }
  return result;
}

function toCandidate(issue: ComicVineIssue, credits: CreditInput[]): MetadataCandidate {
  return {
    source: 'comicvine',
    sourceId: String(issue.id),
    sourceUrl: issue.site_detail_url,
    coverUrl: issue.image?.small_url ?? issue.image?.thumb_url ?? null,
    title: issue.name?.trim() || null,
    series: issue.volume?.name ?? null,
    volume: issue.issue_number,
    // The cover date of a US comic is usually a month or two after it hit the shelves.
    releaseDate: issue.store_date ?? issue.cover_date,
    // Comic Vine doesn't record the language of an issue.
    language: null,
    credits,
  };
}

/** Searches Comic Vine with the user's API key. Throws a translated message on failure. */
export class ComicVineClient {
  constructor(
    private readonly apiKey: string,
    private readonly http: HttpOptions,
  ) {}

  /**
   * With a volume number, looks for that issue in the series matching `query.text`; without one
   * (or when that finds nothing), runs a plain issue search. Then fetches the credits of each
   * issue found, which the search results don't include.
   */
  async search(query: MetadataQuery): Promise<MetadataCandidate[]> {
    let issues: ComicVineIssue[] = [];
    if (query.volume) {
      issues = await this.issuesOfMatchingSeries(query.text, query.volume);
    }
    if (issues.length === 0) {
      const text = query.volume ? `${query.text} ${query.volume}` : query.text;
      issues = await this.get<ComicVineIssue[]>('/search/', {
        resources: 'issue',
        query: text,
        limit: String(MAX_RESULTS),
        field_list: ISSUE_FIELDS,
      });
    }

    const candidates: MetadataCandidate[] = [];
    for (const issue of issues.slice(0, MAX_RESULTS)) {
      // Sequential on purpose: Comic Vine flags bursts of parallel requests.
      const detail = await this.get<ComicVineIssueDetail>(`/issue/4000-${issue.id}/`, { field_list: 'person_credits' });
      candidates.push(toCandidate(issue, comicVineCredits(detail.person_credits ?? [])));
    }
    return candidates;
  }

  private async issuesOfMatchingSeries(series: string, issueNumber: string): Promise<ComicVineIssue[]> {
    const volumes = await this.get<{ id: number }[]>('/search/', {
      resources: 'volume',
      query: series,
      limit: String(MAX_VOLUMES),
      field_list: 'id',
    });
    const issues: ComicVineIssue[] = [];
    for (const volume of volumes.slice(0, MAX_VOLUMES)) {
      issues.push(
        ...(await this.get<ComicVineIssue[]>('/issues/', {
          filter: `volume:${volume.id},issue_number:${issueNumber}`,
          field_list: ISSUE_FIELDS,
        })),
      );
    }
    return issues;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    url.search = new URLSearchParams({ ...params, api_key: this.apiKey, format: 'json' }).toString();
    const body = (await getJson(url.toString(), this.http, 'Comic Vine')) as ComicVineResponse<T>;
    if (body.status_code === 100) {
      throw new Error(t('errors:metadata.invalidKey', { source: 'Comic Vine' }));
    }
    if (body.status_code !== 1) {
      throw new Error(t('errors:metadata.sourceError', { source: 'Comic Vine', message: body.error }));
    }
    return body.results;
  }
}

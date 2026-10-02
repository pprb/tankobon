/**
 * Client-side search and filters of the library page (pure, no DOM).
 * @module
 */
import { currentLanguage } from '@/shared/i18n';
import type { LibraryEntry } from '@/shared/library';
import { formatPersonName } from '@/shared/title-parsing';

/** `'all'` means "don't filter on this"; a number keeps entries rated *at least* that many stars. */
export type RatingFilter = number | 'all';

/** State of the library toolbar. */
export interface LibraryFilters {
  /**
   * Free text matched against the title, the file path (so a folder name finds a series), the
   * series and the credited people's names.
   */
  search: string;
  /** Entries must carry *every* selected tag; an empty list doesn't filter. */
  tags: string[];
  rating: RatingFilter;
}

/** Filters that keep every entry. */
export const EMPTY_FILTERS: LibraryFilters = { search: '', tags: [], rating: 'all' };

/**
 * Every tag in use across the library, for the filter bar to offer. `first` (the library page's
 * quick tags) are listed ahead of the rest even when nothing carries them yet, so "Lu"/"À lire"
 * keep a stable position instead of appearing and moving as entries get tagged.
 */
export function availableTags(entries: LibraryEntry[], first: string[] = []): string[] {
  const rest = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      if (!first.includes(tag)) rest.add(tag);
    }
  }
  return [...first, ...[...rest].sort((a, b) => a.localeCompare(b, currentLanguage()))];
}

/**
 * Lowercased and stripped of diacritics, so "pokemon" matches "Pokémon" — the titles come from
 * file names the user didn't necessarily type accented.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}

/** The texts the search box looks into. */
function searchableTexts(entry: LibraryEntry): string[] {
  return [entry.title, entry.path, entry.series ?? '', ...entry.credits.map(formatPersonName)];
}

/** Whether an entry passes the search text, *every* selected tag and the minimum rating. */
export function matchesFilters(entry: LibraryEntry, filters: LibraryFilters): boolean {
  const search = normalize(filters.search.trim());
  if (search && !searchableTexts(entry).some((text) => normalize(text).includes(search))) {
    return false;
  }
  if (!filters.tags.every((tag) => entry.tags.includes(tag))) return false;
  if (filters.rating !== 'all' && entry.rating < filters.rating) return false;
  return true;
}

/** The entries that pass `matchesFilters`, in their original order. */
export function filterEntries(entries: LibraryEntry[], filters: LibraryFilters): LibraryEntry[] {
  return entries.filter((entry) => matchesFilters(entry, filters));
}

/** Whether any filter would narrow the list (whitespace-only search does not count). */
export function hasActiveFilters(filters: LibraryFilters): boolean {
  return filters.search.trim() !== '' || filters.tags.length > 0 || filters.rating !== 'all';
}

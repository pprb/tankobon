/**
 * When each achievement is earned: pure rules over what the data store holds, so they are
 * unit-tested. Nothing here stores anything; the main process remembers what the renderer
 * reports (`achievements:unlock`), so an achievement stays earned when the books that earned it
 * are removed.
 * @module
 */
import { comicFormat } from '@/shared/comic';
import type { AchievementGroup, AchievementId } from '@/shared/achievements';
import { READ_TAG, type LibraryEntry } from '@/shared/library';
import { MAX_READING_LIST_SIZE, type ReadingList } from '@/shared/reading-list';

import { isFinished, TO_READ_TAG } from './reading-list';

/** What the rules count, taken from the library, the reading lists and the folders. */
export interface AchievementStats {
  /** Books finished (see `isFinished()`). */
  finished: number;
  /** Books in the library. */
  books: number;
  /** Different formats among them (CBZ, CBR, PDF). */
  formats: number;
  /** Folders added to the library. */
  folders: number;
  /** Reading lists. */
  lists: number;
  /** Books in the longest reading list. */
  longestList: number;
  /** Books with a rating. */
  rated: number;
  /** Different tags in use, not counting the two quick tags. */
  tags: number;
  /** Books whose sheet holds credits (filled in by a lookup or by hand). */
  documented: number;
  /** Different languages among the books. */
  languages: number;
}

/** Counts what the rules need. `folders` comes from `library.listFolders()`. */
export function computeStats(library: LibraryEntry[], lists: ReadingList[], folders: number): AchievementStats {
  const tags = new Set<string>();
  const formats = new Set<string>();
  const languages = new Set<string>();
  let finished = 0;
  let rated = 0;
  let documented = 0;
  for (const entry of library) {
    if (isFinished(entry)) finished++;
    if (entry.rating > 0) rated++;
    if (entry.credits.length > 0) documented++;
    for (const tag of entry.tags) if (tag !== READ_TAG && tag !== TO_READ_TAG) tags.add(tag);
    const format = comicFormat(entry.path);
    if (format) formats.add(format);
    if (entry.language) languages.add(entry.language);
  }
  return {
    finished,
    books: library.length,
    formats: formats.size,
    folders,
    lists: lists.length,
    longestList: Math.max(0, ...lists.map((list) => list.entryIds.length)),
    rated,
    tags: tags.size,
    documented,
    languages: languages.size,
  };
}

/** How an achievement is earned: its group, and a count to reach (read from the stats, or `null` for an event). */
export interface AchievementRule {
  group: AchievementGroup;
  /** The count to reach. */
  target: number;
  /** The current count, or `null` for an achievement earned by doing something once (see {@link eventAchievements}). */
  progress: ((stats: AchievementStats) => number) | null;
}

/** The rule of every achievement. */
export const ACHIEVEMENT_RULES: Record<AchievementId, AchievementRule> = {
  firstBook: { group: 'reading', target: 1, progress: (s) => s.finished },
  finished10: { group: 'reading', target: 10, progress: (s) => s.finished },
  finished50: { group: 'reading', target: 50, progress: (s) => s.finished },
  finished200: { group: 'reading', target: 200, progress: (s) => s.finished },
  nightOwl: { group: 'reading', target: 1, progress: null },
  earlyBird: { group: 'reading', target: 1, progress: null },
  librarian: { group: 'library', target: 100, progress: (s) => s.books },
  archivist: { group: 'library', target: 1000, progress: (s) => s.books },
  grandArchivist: { group: 'library', target: 5000, progress: (s) => s.books },
  formats: { group: 'library', target: 3, progress: (s) => s.formats },
  sentinel: { group: 'library', target: 1, progress: (s) => s.folders },
  listMaker: { group: 'organization', target: 1, progress: (s) => s.lists },
  listMaster: {
    group: 'organization',
    target: MAX_READING_LIST_SIZE,
    progress: (s) => Math.max(s.longestList, s.lists >= 5 ? MAX_READING_LIST_SIZE : 0),
  },
  critic10: { group: 'organization', target: 10, progress: (s) => s.rated },
  critic50: { group: 'organization', target: 50, progress: (s) => s.rated },
  tagger: { group: 'organization', target: 10, progress: (s) => s.tags },
  scholar1: { group: 'organization', target: 1, progress: (s) => s.documented },
  scholar10: { group: 'organization', target: 10, progress: (s) => s.documented },
  rightToLeft: { group: 'fun', target: 1, progress: null },
  polyglot: { group: 'fun', target: 2, progress: (s) => s.languages },
};

/** The achievements the stats earn (those earned by an event are never in it). */
export function earnedFromStats(stats: AchievementStats): AchievementId[] {
  return (Object.keys(ACHIEVEMENT_RULES) as AchievementId[]).filter((id) => {
    const { progress, target } = ACHIEVEMENT_RULES[id];
    return progress !== null && progress(stats) >= target;
  });
}

/** What the user is doing as a book is opened, for the achievements earned by an event. */
export interface OpeningContext {
  /** The moment, in local time. */
  at: Date;
  /** The reading direction in force. */
  direction: 'ltr' | 'rtl';
}

/** The achievements earned by opening a book now: at night (22:00–05:00), early (05:00–07:00), right to left. */
export function eventAchievements({ at, direction }: OpeningContext): AchievementId[] {
  const hour = at.getHours();
  const earned: AchievementId[] = [];
  if (hour >= 22 || hour < 5) earned.push('nightOwl');
  if (hour >= 5 && hour < 7) earned.push('earlyBird');
  if (direction === 'rtl') earned.push('rightToLeft');
  return earned;
}

/** Current progress toward an achievement, capped at its target, for the progress bar; `null` for an event. */
export function achievementProgress(id: AchievementId, stats: AchievementStats): { value: number; target: number } | null {
  const { progress, target } = ACHIEVEMENT_RULES[id];
  return progress === null ? null : { value: Math.min(progress(stats), target), target };
}

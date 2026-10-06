/**
 * Achievement types shared between the main process and the renderer (via preload). Which
 * achievements exist is decided here; when one is earned is the renderer's business
 * (`src/lib/achievements.ts`), which tells the main process to remember it.
 * @module
 */

/** The areas the achievements page groups them by; each label is the `achievements:groups.<group>` translation. */
export const ACHIEVEMENT_GROUPS = ['reading', 'library', 'organization', 'fun'] as const;

/** One of {@link ACHIEVEMENT_GROUPS}. */
export type AchievementGroup = (typeof ACHIEVEMENT_GROUPS)[number];

/**
 * Every achievement, by group then in display order. A tiered achievement (10, 50, 200 books) is
 * one id per tier. The name and description of each are the `achievements:items.<id>` translations.
 */
export const ACHIEVEMENT_IDS = [
  'firstBook',
  'finished10',
  'finished50',
  'finished200',
  'nightOwl',
  'earlyBird',
  'librarian',
  'archivist',
  'grandArchivist',
  'formats',
  'sentinel',
  'listMaker',
  'listMaster',
  'critic10',
  'critic50',
  'tagger',
  'scholar1',
  'scholar10',
  'rightToLeft',
  'polyglot',
] as const;

/** The id of an achievement. */
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

/** Whether `value` is the id of an achievement. */
export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === 'string' && (ACHIEVEMENT_IDS as readonly string[]).includes(value);
}

/** An achievement the user has earned. */
export interface UnlockedAchievement {
  id: AchievementId;
  /** ISO timestamp of the moment it was earned. */
  unlockedAt: string;
}

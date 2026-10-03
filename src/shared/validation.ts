/**
 * Validators for the arguments the renderer sends over IPC. The renderer is not trusted: a
 * compromised or buggy one can send anything, whatever the TypeScript signatures of
 * `window.tankobon` say. The main process runs these before a handler's body (see `handle()` in
 * `src/main/ipc/handle.ts`); they are pure and live here so they are unit-tested and reusable (the
 * JSON import checks settings with the same rules).
 * @module
 */
import { isSupportedLanguage } from './i18n';
import { CREDIT_ROLES, type CreditInput, type CreditRole, type MetadataUpdate } from './library';
import type { MetadataQuery } from './metadata';
import { DEFAULT_SETTINGS, type AppSettings } from './settings';

/** A type guard on one unknown value. */
export type Guard<T> = (value: unknown) => value is T;

/** Longest string accepted for an id, a tag, a name or a title; far above anything the UI produces. */
export const MAX_STRING_LENGTH = 1000;

/** Most items accepted in one array argument (tags, credits, entries of a reading list order…). */
export const MAX_ARRAY_LENGTH = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string of reasonable length (possibly empty). */
export function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_STRING_LENGTH;
}

/** A non-empty string of reasonable length: library entry, reading list and open-comic ids, tokens. */
export function isId(value: unknown): value is string {
  return isText(value) && value.length > 0;
}

/** An integer ≥ 0: a page index, a page number. */
export function isIndex(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

/** An integer rating, 0 (unrated) to 5. */
export function isRating(value: unknown): value is number {
  return isIndex(value) && value <= 5;
}

/** An array of at most {@link MAX_ARRAY_LENGTH} items that all satisfy `guard`. */
export function arrayOf<T>(guard: Guard<T>): Guard<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.length <= MAX_ARRAY_LENGTH && value.every(guard);
}

/** A string, or null. */
export function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value);
}

function isCreditRole(value: unknown): value is CreditRole {
  return typeof value === 'string' && (CREDIT_ROLES as readonly string[]).includes(value);
}

function isCreditInput(value: unknown): value is CreditInput {
  return isRecord(value) && isText(value.firstName) && isText(value.lastName) && isCreditRole(value.role);
}

/**
 * A {@link MetadataUpdate}: a plain object whose present fields have the right types. An absent
 * (or `undefined`) field means "leave as is", so it is accepted.
 */
export function isMetadataUpdate(value: unknown): value is MetadataUpdate {
  if (!isRecord(value)) return false;
  const { title, series, volume, releaseDate, language, credits } = value;
  return (
    (title === undefined || isText(title)) &&
    (series === undefined || isTextOrNull(series)) &&
    (volume === undefined || isTextOrNull(volume)) &&
    (releaseDate === undefined || isTextOrNull(releaseDate)) &&
    (language === undefined || isTextOrNull(language)) &&
    (credits === undefined || arrayOf(isCreditInput)(credits))
  );
}

/** A {@link MetadataQuery}: the search text and the volume (or null). */
export function isMetadataQuery(value: unknown): value is MetadataQuery {
  return isRecord(value) && isText(value.text) && isTextOrNull(value.volume);
}

/** Whether `key` names one of the {@link AppSettings}. */
export function isSettingKey(key: unknown): key is keyof AppSettings {
  return typeof key === 'string' && Object.hasOwn(DEFAULT_SETTINGS, key);
}

const READING_DIRECTIONS = ['ltr', 'rtl'];
const SCROLL_DIRECTIONS = ['standard', 'inverted'];
const READING_MODES = ['single', 'continuous'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** Upper bound of the gap between pages, in px; the settings page offers far less. */
const MAX_PAGE_SPACING = 1000;

/**
 * Whether `value` is acceptable for the setting `key`: the type of its default, and for the
 * constrained ones (language, reading direction, colour…) one of the values the app understands.
 */
export function isSettingValue<K extends keyof AppSettings>(key: K, value: unknown): value is AppSettings[K] {
  if (typeof value !== typeof DEFAULT_SETTINGS[key]) return false;
  switch (key) {
    case 'language':
      return value === 'system' || (typeof value === 'string' && isSupportedLanguage(value));
    case 'readingDirection':
      return READING_DIRECTIONS.includes(value as string);
    case 'scrollDirection':
      return SCROLL_DIRECTIONS.includes(value as string);
    case 'readingMode':
      return READING_MODES.includes(value as string);
    case 'pageSpacing':
      return Number.isFinite(value) && (value as number) >= 0 && (value as number) <= MAX_PAGE_SPACING;
    case 'readerBackground':
      return typeof value === 'string' && HEX_COLOR.test(value);
    case 'comicVineApiKey':
    case 'googleBooksApiKey':
      return isText(value);
    default:
      return true;
  }
}

/** The result type of {@link tuple}: the guarded types of each position. */
export type GuardedTuple<G extends readonly Guard<unknown>[]> = {
  -readonly [K in keyof G]: G[K] extends Guard<infer T> ? T : never;
};

/**
 * Guard for a handler's whole argument list: exactly one argument per guard, each satisfying its
 * guard. `tuple()` with no guard accepts only an empty list.
 */
export function tuple<G extends readonly Guard<unknown>[]>(...guards: G): (args: unknown[]) => args is GuardedTuple<G> {
  return (args): args is GuardedTuple<G> => args.length === guards.length && guards.every((guard, i) => guard(args[i]));
}

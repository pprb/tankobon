/**
 * JSON import: validates a user-picked export file and merges it into the local database.
 * @module
 */
import { randomUUID } from 'node:crypto';

import { CREDIT_ROLES, type CreditInput, type CreditRole, type LibraryEntry } from '../../shared/library';
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/settings';
import type { ExportedData, ExportedReadingList } from './export-service';
import type { LibraryRepository } from './library-repository';
import type { ReadingListRepository } from './reading-list-repository';
import type { SettingsRepository } from './settings-repository';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** Credits with a last name and a known role; the person ids are not kept (people are matched by name). */
function toCredits(value: unknown): CreditInput[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((credit): CreditInput[] =>
    isRecord(credit) &&
    typeof credit.lastName === 'string' &&
    credit.lastName.trim() !== '' &&
    CREDIT_ROLES.includes(credit.role as CreditRole)
      ? [
          {
            firstName: typeof credit.firstName === 'string' ? credit.firstName : '',
            lastName: credit.lastName,
            role: credit.role as CreditRole,
          },
        ]
      : [],
  );
}

function toEntry(value: unknown): LibraryEntry | null {
  if (!isRecord(value) || typeof value.path !== 'string' || value.path === '') {
    return null;
  }
  const pageCount = Math.max(0, Math.trunc(toNumber(value.pageCount, 0)));
  const now = new Date().toISOString();
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : randomUUID(),
    path: value.path,
    title: typeof value.title === 'string' ? value.title : value.path,
    pageCount,
    // Clamped like `touch` does: a snapshot can disagree with the file it describes.
    currentPage: Math.min(Math.max(0, Math.trunc(toNumber(value.currentPage, 0))), Math.max(0, pageCount - 1)),
    addedAt: typeof value.addedAt === 'string' ? value.addedAt : now,
    lastOpenedAt: typeof value.lastOpenedAt === 'string' ? value.lastOpenedAt : now,
    fileCount: Math.max(0, Math.trunc(toNumber(value.fileCount, 0))),
    fileSize: Math.max(0, Math.trunc(toNumber(value.fileSize, 0))),
    rating: Math.min(5, Math.max(0, Math.trunc(toNumber(value.rating, 0)))),
    tags: Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    // Exports from before the metadata lookup lack these fields: they come back empty.
    titleLocked: value.titleLocked === true,
    series: toNullableString(value.series),
    volume: toNullableString(value.volume),
    releaseDate: toNullableString(value.releaseDate),
    language: toNullableString(value.language),
    credits: toCredits(value.credits).map((credit) => ({ ...credit, personId: '' })),
  };
}

/** Lists with an id and a name; books are kept as the paths they reference, resolved on import. */
function toReadingLists(value: unknown): ExportedReadingList[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((list): ExportedReadingList[] =>
    isRecord(list) && typeof list.id === 'string' && list.id !== '' && typeof list.name === 'string' && list.name.trim() !== ''
      ? [
          {
            id: list.id,
            name: list.name.trim(),
            createdAt: typeof list.createdAt === 'string' ? list.createdAt : new Date().toISOString(),
            paths: Array.isArray(list.paths) ? list.paths.filter((p): p is string => typeof p === 'string') : [],
          },
        ]
      : [],
  );
}

/**
 * Keeps only the settings keys the app knows about, and only when the stored value has the
 * type the default has — an old or hand-edited export can't inject unknown keys or wrong types.
 */
function toSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    const imported = value[key];
    if (typeof imported === typeof DEFAULT_SETTINGS[key]) {
      (settings[key] as unknown) = imported;
    }
  }
  return settings;
}

/**
 * Validates the JSON text of a file the user picked. Throws a user-facing (French) message when
 * it isn't a Tankōbon export; individual library entries that are too broken to use are dropped
 * rather than failing the whole import.
 */
export function parseExport(raw: string): ExportedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Fichier illisible : ce n'est pas du JSON valide.");
  }
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.library)) {
    throw new Error("Fichier non reconnu : ce n'est pas un export Tankōbon (version 1).");
  }
  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    library: parsed.library.map(toEntry).filter((entry): entry is LibraryEntry => entry !== null),
    // Exports from before reading lists have none.
    readingLists: toReadingLists(parsed.readingLists),
    settings: toSettings(parsed.settings),
  };
}

/**
 * Merges a parsed snapshot into the local database: library entries are matched by file path
 * (the snapshot wins for the ones it contains, so restoring a backup restores its progress,
 * ratings and tags), entries only present locally are left alone, and settings are replaced.
 * Reading lists are matched by id, the snapshot winning too; their books are found by path, and
 * a path that matches no library entry is dropped.
 */
export function applyImport(
  libraryRepo: LibraryRepository,
  settingsRepo: SettingsRepository,
  readingListRepo: ReadingListRepository,
  data: ExportedData,
): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  for (const entry of data.library) {
    if (libraryRepo.upsert(entry) === 'created') {
      added += 1;
    } else {
      updated += 1;
    }
  }
  const idByPath = new Map(libraryRepo.list().map((entry) => [entry.path, entry.id]));
  for (const list of data.readingLists) {
    readingListRepo.upsert({
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      entryIds: list.paths.flatMap((p) => idByPath.get(p) ?? []),
    });
  }
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    settingsRepo.set(key, data.settings[key]);
  }
  return { added, updated };
}

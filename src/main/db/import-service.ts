import { randomUUID } from 'node:crypto';

import type { LibraryEntry } from '../../shared/library';
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/settings';
import type { ExportedData } from './export-service';
import type { LibraryRepository } from './library-repository';
import type { SettingsRepository } from './settings-repository';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
  };
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
    settings: toSettings(parsed.settings),
  };
}

/**
 * Merges a parsed snapshot into the local database: library entries are matched by file path
 * (the snapshot wins for the ones it contains, so restoring a backup restores its progress,
 * ratings and tags), entries only present locally are left alone, and settings are replaced.
 */
export function applyImport(
  libraryRepo: LibraryRepository,
  settingsRepo: SettingsRepository,
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
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    settingsRepo.set(key, data.settings[key]);
  }
  return { added, updated };
}

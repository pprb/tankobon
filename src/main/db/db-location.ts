// Where the SQLite file lives. This can't be an `AppSettings` entry like everything else: the
// settings are stored *in* the database, so the location has to be resolvable before the database
// is open. It lives in its own tiny JSON pointer file, which always stays in `userData` — only
// the database it points at moves.
import { accessSync, constants, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { DatabaseLocation } from '../../shared/data';

const DB_FILE_NAME = 'tankobon.db';
const POINTER_FILE_NAME = 'db-location.json';

function pointerPath(userDataDir: string): string {
  return path.join(userDataDir, POINTER_FILE_NAME);
}

/**
 * Reads the configured directory, or null when there is none. A missing, unreadable or malformed
 * pointer falls back to the default rather than throwing: the app must still start when someone
 * hand-edits (or a sync tool mangles) this file.
 */
export function readLocationPointer(userDataDir: string): string | null {
  let raw: string;
  try {
    raw = readFileSync(pointerPath(userDataDir), 'utf-8');
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const directory = (parsed as { directory?: unknown })?.directory;
    return typeof directory === 'string' && directory !== '' ? directory : null;
  } catch {
    return null;
  }
}

/** Points the app at `directory`, or back at `userData` when given null. */
export function writeLocationPointer(userDataDir: string, directory: string | null): void {
  if (directory === null) {
    rmSync(pointerPath(userDataDir), { force: true });
    return;
  }
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(pointerPath(userDataDir), JSON.stringify({ directory }, null, 2), 'utf-8');
}

export function resolveDatabaseLocation(userDataDir: string): DatabaseLocation {
  const configured = readLocationPointer(userDataDir);
  const directory = configured ?? userDataDir;
  return { directory, filePath: path.join(directory, DB_FILE_NAME), isDefault: configured === null };
}

/**
 * Fails early (with a user-facing French message) on a directory the app couldn't open a database
 * in — otherwise the problem would only surface as a crash on the next start.
 */
export function checkDirectoryUsable(directory: string): string | null {
  try {
    mkdirSync(directory, { recursive: true });
    accessSync(directory, constants.W_OK);
    return null;
  } catch {
    return `Impossible d'écrire dans ${directory}.`;
  }
}

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  checkDirectoryUsable,
  readLocationPointer,
  resolveDatabaseLocation,
  writeLocationPointer,
} from './db-location';

describe('db-location', () => {
  let userData: string;

  beforeEach(() => {
    userData = mkdtempSync(path.join(tmpdir(), 'tankobon-test-'));
  });

  afterEach(() => {
    rmSync(userData, { recursive: true, force: true });
  });

  it('defaults to the user data directory when no pointer file exists', () => {
    expect(readLocationPointer(userData)).toBeNull();
    expect(resolveDatabaseLocation(userData)).toEqual({
      directory: userData,
      filePath: path.join(userData, 'tankobon.db'),
      isDefault: true,
    });
  });

  it('round-trips a configured directory', () => {
    writeLocationPointer(userData, path.join(userData, 'elsewhere'));

    expect(resolveDatabaseLocation(userData)).toEqual({
      directory: path.join(userData, 'elsewhere'),
      filePath: path.join(userData, 'elsewhere', 'tankobon.db'),
      isDefault: false,
    });
  });

  it('goes back to the default when the pointer is removed', () => {
    writeLocationPointer(userData, path.join(userData, 'elsewhere'));
    writeLocationPointer(userData, null);

    expect(resolveDatabaseLocation(userData).isDefault).toBe(true);
  });

  // The app has to start even if this file gets hand-edited or mangled by a sync tool.
  it('falls back to the default on a malformed pointer file', () => {
    writeFileSync(path.join(userData, 'db-location.json'), 'not json', 'utf-8');
    expect(readLocationPointer(userData)).toBeNull();

    writeFileSync(path.join(userData, 'db-location.json'), '{"directory":""}', 'utf-8');
    expect(readLocationPointer(userData)).toBeNull();
  });

  it('accepts a writable directory, creating it if needed', () => {
    const directory = path.join(userData, 'new', 'nested');
    expect(checkDirectoryUsable(directory)).toBeNull();
    expect(resolveDatabaseLocation(userData).isDefault).toBe(true);
  });

  it('reports a directory it cannot write into', () => {
    // A file where a directory is expected: mkdir fails on every platform.
    const filePath = path.join(userData, 'a-file');
    writeFileSync(filePath, '', 'utf-8');

    expect(checkDirectoryUsable(filePath)).toMatch(/Impossible d'écrire/);
  });
});

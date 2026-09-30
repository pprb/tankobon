import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { collectComicFiles, isSupportedComicFile } from './library-scanner';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

/** Builds a directory tree from `relative path -> contents` entries and returns its root. */
async function tree(files: string[]): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'tankobon-scan-'));
  roots.push(root);
  for (const file of files) {
    const fullPath = path.join(root, file);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, '');
  }
  return root;
}

describe('isSupportedComicFile', () => {
  it('accepts the supported extensions, whatever the case', () => {
    expect(isSupportedComicFile('a.cbz')).toBe(true);
    expect(isSupportedComicFile('a.CBR')).toBe(true);
    expect(isSupportedComicFile('a.Pdf')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSupportedComicFile('cover.jpg')).toBe(false);
    expect(isSupportedComicFile('ComicInfo.xml')).toBe(false);
    expect(isSupportedComicFile('README')).toBe(false);
    // Not an extension — the name merely contains the word.
    expect(isSupportedComicFile('cbz')).toBe(false);
  });
});

describe('collectComicFiles', () => {
  it('finds comics recursively and ignores everything else', async () => {
    const root = await tree([
      'tome-1.cbz',
      'cover.jpg',
      'serie/tome-2.cbr',
      'serie/notes.txt',
      'serie/bonus/artbook.pdf',
    ]);

    expect(await collectComicFiles(root)).toEqual([
      path.join(root, 'serie', 'bonus', 'artbook.pdf'),
      path.join(root, 'serie', 'tome-2.cbr'),
      path.join(root, 'tome-1.cbz'),
    ]);
  });

  it('returns an empty list for a directory without comics', async () => {
    expect(await collectComicFiles(await tree(['notes.txt']))).toEqual([]);
  });

  it('returns an empty list rather than throwing for a missing directory', async () => {
    expect(await collectComicFiles(path.join(tmpdir(), 'tankobon-does-not-exist'))).toEqual([]);
  });
});

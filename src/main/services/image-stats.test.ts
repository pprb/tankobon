import { describe, expect, it } from 'vitest';

import type { ComicPage } from '../../shared/comic';
import type { ComicArchive } from './comic-archive';
import { averageSize, measureArchive } from './image-stats';

/** A PNG header declaring `width` × `height`: all `readImageSize()` looks at. */
function png(width: number, height: number): ComicPage {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return { data: bytes, mimeType: 'image/png' };
}

function archiveOf(pages: (ComicPage | Error)[], pageSize?: ComicArchive['pageSize']): ComicArchive {
  return {
    path: 'a.cbz',
    pages: pages.map((_, i) => `p${i}.png`),
    fileCount: pages.length,
    readPage: async (index) => {
      const page = pages[index]!;
      if (page instanceof Error) throw page;
      return page;
    },
    pageSize,
    close: async () => undefined,
  };
}

describe('averageSize', () => {
  it('is null for no page', () => {
    expect(averageSize([])).toBeNull();
  });

  it('takes the simple mean of widths and heights, rounded', () => {
    expect(
      averageSize([
        { width: 1000, height: 1500 },
        { width: 1001, height: 1600 },
        { width: 1001, height: 1700 },
      ]),
    ).toEqual({ width: 1001, height: 1600 });
  });
});

describe('measureArchive', () => {
  it('averages the sizes read from the image headers', async () => {
    const archive = archiveOf([png(1000, 1400), png(1200, 1800)]);
    expect(await measureArchive(archive)).toEqual({ width: 1100, height: 1600 });
  });

  it('leaves out the pages it cannot read or measure', async () => {
    const unknown: ComicPage = { data: new Uint8Array(30), mimeType: 'image/bmp' };
    const archive = archiveOf([png(800, 1200), new Error('corrupt'), unknown]);
    expect(await measureArchive(archive)).toEqual({ width: 800, height: 1200 });
  });

  it('is null when no page can be measured', async () => {
    expect(await measureArchive(archiveOf([new Error('corrupt')]))).toBeNull();
  });

  it('asks the archive for the page sizes when it knows them', async () => {
    const archive = archiveOf([new Error('never read')], async () => ({ width: 1654, height: 2339 }));
    expect(await measureArchive(archive)).toEqual({ width: 1654, height: 2339 });
  });
});

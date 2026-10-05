/**
 * Average dimensions of a book's page images, for the library's background scan.
 * @module
 */
import type { ComicArchive } from './comic-archive';
import { readImageSize, type ImageSize } from './image-size';

/** Simple (unweighted) mean of the widths and of the heights, rounded to whole pixels; null for an empty list. */
export function averageSize(sizes: readonly ImageSize[]): ImageSize | null {
  if (sizes.length === 0) {
    return null;
  }
  const total = sizes.reduce((sum, size) => ({ width: sum.width + size.width, height: sum.height + size.height }), {
    width: 0,
    height: 0,
  });
  return { width: Math.round(total.width / sizes.length), height: Math.round(total.height / sizes.length) };
}

/**
 * Averages the dimensions of every page of `archive`, one page at a time. A page whose size can't
 * be told (a format whose header isn't read, an unreadable or oversized entry) is left out of the
 * average; null when no page could be measured.
 */
export async function measureArchive(archive: ComicArchive): Promise<ImageSize | null> {
  const sizes: ImageSize[] = [];
  for (let index = 0; index < archive.pages.length; index++) {
    try {
      const size = archive.pageSize
        ? await archive.pageSize(index)
        : readImageSize((await archive.readPage(index)).data);
      if (size && size.width > 0 && size.height > 0) {
        sizes.push(size);
      }
    } catch {
      // This page only goes unmeasured.
    }
  }
  return averageSize(sizes);
}

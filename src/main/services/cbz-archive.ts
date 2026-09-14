import StreamZip from 'node-stream-zip';

import type { ComicPage } from '../../shared/comic';
import { imageMimeType, isPageEntry, sortPages, type ComicArchive } from './comic-archive';

export class CbzArchive implements ComicArchive {
  private constructor(
    readonly path: string,
    readonly pages: readonly string[],
    private readonly zip: StreamZip.StreamZipAsync,
  ) {}

  static async open(filePath: string): Promise<CbzArchive> {
    const zip = new StreamZip.async({ file: filePath });
    try {
      const entries = await zip.entries();
      const pages = sortPages(
        Object.values(entries)
          .filter((entry) => !entry.isDirectory && isPageEntry(entry.name))
          .map((entry) => entry.name),
      );
      if (pages.length === 0) {
        throw new Error(`Aucune image trouvée dans ${filePath}`);
      }
      return new CbzArchive(filePath, pages, zip);
    } catch (error) {
      await zip.close();
      throw error;
    }
  }

  async readPage(index: number): Promise<ComicPage> {
    const entryName = this.pages[index];
    if (entryName === undefined) {
      throw new RangeError(`Page ${index} hors limites (0-${this.pages.length - 1})`);
    }
    const data = await this.zip.entryData(entryName);
    // Copy into a fresh ArrayBuffer: Buffers may be views on a shared pool.
    return { data: new Uint8Array(data), mimeType: imageMimeType(entryName)! };
  }

  close(): Promise<void> {
    return this.zip.close();
  }
}

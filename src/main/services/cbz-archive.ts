import StreamZip from 'node-stream-zip';

import type { ComicPage } from '../../shared/comic';
import { imageMimeType, isPageEntry, sortPages, type ComicArchive } from './comic-archive';

export class CbzArchive implements ComicArchive {
  // Reads still in flight. node-stream-zip closes its file descriptor immediately on
  // `close()`, and a read that's mid-way then fails with EBADF on an internal stream
  // whose error is never forwarded to the `entryData()` promise — it surfaces as an
  // uncaught exception that takes the whole main process down. So `close()` waits for
  // these to settle first, and `readPage()` refuses to start once closing has begun.
  private readonly pendingReads = new Set<Promise<unknown>>();
  private closing = false;

  private constructor(
    readonly path: string,
    readonly pages: readonly string[],
    readonly fileCount: number,
    private readonly zip: StreamZip.StreamZipAsync,
  ) {}

  static async open(filePath: string): Promise<CbzArchive> {
    const zip = new StreamZip.async({ file: filePath });
    try {
      const entries = await zip.entries();
      const files = Object.values(entries).filter((entry) => !entry.isDirectory);
      const pages = sortPages(files.filter((entry) => isPageEntry(entry.name)).map((entry) => entry.name));
      if (pages.length === 0) {
        throw new Error(`Aucune image trouvée dans ${filePath}`);
      }
      return new CbzArchive(filePath, pages, files.length, zip);
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
    if (this.closing) {
      throw new Error(`Archive fermée : ${this.path}`);
    }
    const read = this.zip.entryData(entryName);
    this.pendingReads.add(read);
    try {
      const data = await read;
      // Copy into a fresh ArrayBuffer: Buffers may be views on a shared pool.
      return { data: new Uint8Array(data), mimeType: imageMimeType(entryName)! };
    } finally {
      this.pendingReads.delete(read);
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    await Promise.allSettled([...this.pendingReads]);
    await this.zip.close();
  }
}

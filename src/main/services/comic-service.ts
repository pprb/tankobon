// Keeps opened archives alive between IPC calls, addressed by an opaque id.
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { ArchiveInfo, ComicPage } from '../../shared/comic';
import { CbrArchive } from './cbr-archive';
import { CbzArchive } from './cbz-archive';
import type { ComicArchive } from './comic-archive';
import { PdfArchive } from './pdf-archive';

const openers: Record<string, (filePath: string) => Promise<ComicArchive>> = {
  '.cbz': CbzArchive.open,
  '.cbr': CbrArchive.open,
  '.pdf': PdfArchive.open,
};

/**
 * Opens a single archive, without registering it anywhere. Shared with the folder scanner
 * (`library-scanner.ts`), which opens each file it finds just long enough to read its page count
 * and closes it again — it has no use for `ComicService`'s keep-alive map.
 */
export async function openArchive(filePath: string): Promise<ComicArchive> {
  const ext = path.extname(filePath).toLowerCase();
  const opener = openers[ext];
  if (!opener) {
    throw new Error(`Format non supporté : ${ext || '(sans extension)'}`);
  }
  return opener(filePath);
}

export class ComicService {
  private readonly archives = new Map<string, ComicArchive>();

  async open(filePath: string): Promise<ArchiveInfo> {
    const archive = await openArchive(filePath);
    const id = randomUUID();
    this.archives.set(id, archive);
    return {
      id,
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      pageCount: archive.pages.length,
      fileCount: archive.fileCount,
    };
  }

  readPage(id: string, index: number): Promise<ComicPage> {
    return this.get(id).readPage(index);
  }

  async close(id: string): Promise<void> {
    const archive = this.archives.get(id);
    if (archive) {
      this.archives.delete(id);
      await archive.close();
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.archives.keys()].map((id) => this.close(id)));
  }

  private get(id: string): ComicArchive {
    const archive = this.archives.get(id);
    if (!archive) {
      throw new Error(`Archive inconnue : ${id}`);
    }
    return archive;
  }
}

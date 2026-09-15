// Keeps opened archives alive between IPC calls, addressed by an opaque id.
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { ArchiveInfo, ComicPage } from '../../shared/comic';
import { CbrArchive } from './cbr-archive';
import { CbzArchive } from './cbz-archive';
import type { ComicArchive } from './comic-archive';

const openers: Record<string, (filePath: string) => Promise<ComicArchive>> = {
  '.cbz': CbzArchive.open,
  '.cbr': CbrArchive.open,
};

export class ComicService {
  private readonly archives = new Map<string, ComicArchive>();

  async open(filePath: string): Promise<ArchiveInfo> {
    const ext = path.extname(filePath).toLowerCase();
    const opener = openers[ext];
    if (!opener) {
      throw new Error(`Format non supporté : ${ext || '(sans extension)'}`);
    }
    const archive = await opener(filePath);
    const id = randomUUID();
    this.archives.set(id, archive);
    return {
      id,
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      pageCount: archive.pages.length,
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

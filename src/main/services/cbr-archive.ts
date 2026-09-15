import { createExtractorFromData, type Extractor } from 'node-unrar-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ComicPage } from '../../shared/comic';
import { imageMimeType, isPageEntry, sortPages, type ComicArchive } from './comic-archive';

// The Emscripten-compiled wasm module is copied next to the bundled main.js (see
// vite.main.config.mts): loaded once and reused for every archive opened.
let wasmBinary: ArrayBuffer | undefined;
async function getWasmBinary(): Promise<ArrayBuffer> {
  wasmBinary ??= Uint8Array.from(await readFile(join(__dirname, 'unrar.wasm'))).buffer;
  return wasmBinary;
}

export class CbrArchive implements ComicArchive {
  private constructor(
    readonly path: string,
    readonly pages: readonly string[],
    readonly fileCount: number,
    private readonly extractor: Extractor<Uint8Array>,
  ) {}

  static async open(filePath: string): Promise<CbrArchive> {
    const [fileBytes, wasm] = await Promise.all([readFile(filePath), getWasmBinary()]);
    const extractor = await createExtractorFromData({
      data: Uint8Array.from(fileBytes).buffer,
      wasmBinary: wasm,
    });
    const { fileHeaders } = extractor.getFileList();
    const files = [...fileHeaders].filter((header) => !header.flags.directory);
    const pages = sortPages(files.filter((header) => isPageEntry(header.name)).map((header) => header.name));
    if (pages.length === 0) {
      throw new Error(`Aucune image trouvée dans ${filePath}`);
    }
    return new CbrArchive(filePath, pages, files.length, extractor);
  }

  async readPage(index: number): Promise<ComicPage> {
    const entryName = this.pages[index];
    if (entryName === undefined) {
      throw new RangeError(`Page ${index} hors limites (0-${this.pages.length - 1})`);
    }
    // The generator must be drained fully, or the underlying archive handle leaks.
    const [file] = [...this.extractor.extract({ files: [entryName] }).files];
    if (!file?.extraction) {
      throw new Error(`Impossible d'extraire la page : ${entryName}`);
    }
    // Copy into a fresh ArrayBuffer: the extraction may be a view on a shared/wasm buffer.
    return { data: new Uint8Array(file.extraction), mimeType: imageMimeType(entryName)! };
  }

  close(): Promise<void> {
    // In-memory extractor: nothing to release (no open file handle to the archive itself).
    return Promise.resolve();
  }
}

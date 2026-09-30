/**
 * CBR (RAR) support.
 * @module
 */
import { createExtractorFromData, type Extractor } from 'node-unrar-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ComicPage } from '../../shared/comic';
import { imageMimeType, isPageEntry, sortPages, type ComicArchive } from './comic-archive';

// The Emscripten-compiled wasm module is copied next to the bundled main.cjs (see
// vite.main.config.mts): loaded once and reused for every archive opened.
let wasmBinary: ArrayBuffer | undefined;
async function getWasmBinary(): Promise<ArrayBuffer> {
  wasmBinary ??= Uint8Array.from(await readFile(join(__dirname, 'unrar.wasm'))).buffer;
  return wasmBinary;
}

// node-unrar-js runs every extractor through one shared wasm module, which only knows the most
// recently *created* extractor (`createExtractorFromData` sets a module-wide pointer to it). An
// extractor kept alive and reused after another archive was opened (a second book, a folder scan)
// would feed the wasm the other archive's bytes: "File is not RAR archive", then a TypeError. So an
// archive keeps only its bytes, and every operation creates its own extractor and uses it up
// synchronously, one at a time, so that no other creation can slip in between.
let queue: Promise<unknown> = Promise.resolve();
function withExtractor<T>(data: ArrayBuffer, use: (extractor: Extractor<Uint8Array>) => T): Promise<T> {
  const run = queue.then(async () => {
    const extractor = await createExtractorFromData({ data, wasmBinary: await getWasmBinary() });
    return use(extractor);
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * A `.cbr` (RAR) comic, read with node-unrar-js (unrar compiled to WebAssembly). The whole file is
 * loaded in memory when opened.
 */
export class CbrArchive implements ComicArchive {
  private constructor(
    readonly path: string,
    readonly pages: readonly string[],
    readonly fileCount: number,
    private readonly data: ArrayBuffer,
  ) {}

  /** Reads and indexes the archive; throws when it holds no image. */
  static async open(filePath: string): Promise<CbrArchive> {
    const data = Uint8Array.from(await readFile(filePath)).buffer;
    // The generator must be drained fully, or the underlying archive handle leaks.
    const files = await withExtractor(data, (extractor) =>
      [...extractor.getFileList().fileHeaders].filter((header) => !header.flags.directory),
    );
    const pages = sortPages(files.filter((header) => isPageEntry(header.name)).map((header) => header.name));
    if (pages.length === 0) {
      throw new Error(`Aucune image trouvée dans ${filePath}`);
    }
    return new CbrArchive(filePath, pages, files.length, data);
  }

  /** Extracts page `index` (0-based); throws a `RangeError` when out of range. */
  async readPage(index: number): Promise<ComicPage> {
    const entryName = this.pages[index];
    if (entryName === undefined) {
      throw new RangeError(`Page ${index} hors limites (0-${this.pages.length - 1})`);
    }
    // Drained fully here too, for the same reason as in open().
    const [file] = await withExtractor(this.data, (extractor) => [...extractor.extract({ files: [entryName] }).files]);
    if (!file?.extraction) {
      throw new Error(`Impossible d'extraire la page : ${entryName}`);
    }
    // Copy into a fresh ArrayBuffer: the extraction may be a view on a shared/wasm buffer.
    return { data: new Uint8Array(file.extraction), mimeType: imageMimeType(entryName)! };
  }

  /** Nothing to release: the archive lives in memory. */
  close(): Promise<void> {
    // In-memory archive: nothing to release (no open file handle to the archive itself).
    return Promise.resolve();
  }
}

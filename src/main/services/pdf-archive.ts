import { createCanvas, DOMMatrix, Image, ImageData, Path2D } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ComicPage } from '../../shared/comic';
import type { ComicArchive } from './comic-archive';

// pdf.js's rendering code (the `legacy` build, meant for non-browser environments) references
// DOMMatrix/Path2D/ImageData/Image as bare globals, assuming a browser. @napi-rs/canvas is the
// Node-compatible implementation of those APIs pdf.js itself expects to find (it even declares
// it as an optional dependency for exactly this purpose) — it just doesn't install them globally
// on its own, so we do it once here before any PDF gets parsed or rendered.
const globals = globalThis as Record<string, unknown>;
globals.DOMMatrix ??= DOMMatrix;
globals.Path2D ??= Path2D;
globals.ImageData ??= ImageData;
globals.Image ??= Image;

// Kept as a real npm dependency (not bundled by Vite — see vite.main.config.mts) so its
// `standard_fonts`/`cmaps` data directories and its `@napi-rs/canvas` native dependency are
// resolved normally from node_modules at runtime, both in dev and once packaged.
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsPromise: Promise<PdfjsModule> | undefined;
function getPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;
type PDFDocumentLoadingTask = import('pdfjs-dist').PDFDocumentLoadingTask;

// Renders at a fixed ~200 DPI regardless of the page's physical size: high enough to avoid
// triggering the reader's AI upscaling at normal zoom levels (comparable to a decent comic
// scan), without the memory/CPU cost of going much higher. PDF pages are vector content, so
// unlike CBZ/CBR there's no "native resolution" to defer to.
const RENDER_SCALE = 200 / 72;

// `require` (a plain CJS global here, not `createRequire(import.meta.url)`): Vite bundles this
// module into main.js as CommonJS, where Rollup rewrites `import.meta.url` to `{}.url`
// (`undefined`) — the same reason cbr-archive.ts reads its wasm file via `__dirname`, not a URL.
//
// pdf.js validates these two options with `val.endsWith('/')` and rejects anything else, so the
// trailing separator has to be a forward slash even on Windows (where `path.sep` is `\`). It
// then just hands the concatenated string to `fs.readFile`, which accepts forward slashes on
// Windows too — so normalizing the whole path to `/` is safe.
function pdfjsAssetDir(name: string): string {
  const dir = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), name);
  return dir.replaceAll(path.sep, '/') + '/';
}

export class PdfArchive implements ComicArchive {
  readonly fileCount: number;

  private constructor(
    readonly path: string,
    readonly pages: readonly string[],
    private readonly doc: PDFDocumentProxy,
    private readonly loadingTask: PDFDocumentLoadingTask,
  ) {
    this.fileCount = pages.length;
  }

  static async open(filePath: string): Promise<PdfArchive> {
    const pdfjs = await getPdfjs();
    const data = new Uint8Array(await readFile(filePath));
    const loadingTask = pdfjs.getDocument({
      data,
      standardFontDataUrl: pdfjsAssetDir('standard_fonts'),
      cMapUrl: pdfjsAssetDir('cmaps'),
      cMapPacked: true,
    });
    const doc = await loadingTask.promise;
    if (doc.numPages === 0) {
      await loadingTask.destroy();
      throw new Error(`Aucune page trouvée dans ${filePath}`);
    }
    const pages = Array.from({ length: doc.numPages }, (_, i) => `page-${i + 1}`);
    return new PdfArchive(filePath, pages, doc, loadingTask);
  }

  async readPage(index: number): Promise<ComicPage> {
    if (index < 0 || index >= this.pages.length) {
      throw new RangeError(`Page ${index} hors limites (0-${this.pages.length - 1})`);
    }
    const page = await this.doc.getPage(index + 1);
    try {
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = createCanvas(viewport.width, viewport.height);
      // `canvas`/`canvasContext` are typed for the DOM Canvas API; @napi-rs/canvas is a
      // Node-native implementation of that same API (pdf.js's own optional dependency for it).
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
      return { data: new Uint8Array(canvas.toBuffer('image/png')), mimeType: 'image/png' };
    } finally {
      page.cleanup();
    }
  }

  async close(): Promise<void> {
    await this.loadingTask.destroy();
  }
}

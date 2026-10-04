# 0004. PDF pages rasterized in the main process with pdf.js + `@napi-rs/canvas`

- **Status:** Accepted; the rendering now runs in the decoder process ([ADR 0012](./0012-decoder-utility-process.md))
- **Date:** recorded 2026-09-30 (the decision predates this record)

## Context

The reader, the zoom and the continuous mode all work on page *images* returned by a `ComicArchive`. PDF pages are vector content, with no native resolution. Rendering them in Node needs a Canvas implementation, which Node doesn't have.

## Decision

- `PdfArchive` (`src/main/services/pdf-archive.ts`) implements `ComicArchive` like CBZ/CBR, rasterizing each page on demand to PNG at a fixed ~200 DPI (`RENDER_SCALE = 200 / 72`).
- It uses `pdfjs-dist`'s `legacy` build, with `@napi-rs/canvas` providing `DOMMatrix`, `Path2D`, `ImageData` and `Image` (installed once on `globalThis`) and the canvas itself. `@napi-rs/canvas` is pdf.js's own optional dependency for Node and ships prebuilt per-platform binaries (no compilation step).
- Both packages are kept external in the main bundle and copied into the packaged app by the `packageAfterCopy` hook of `forge.config.ts`; `AutoUnpackNativesPlugin` unpacks the native binary out of the asar archive.

## Consequences

- The rest of the reader doesn't distinguish a PDF page from an image page.
- ~200 DPI is high enough not to trigger the AI upscaling at normal zoom, without the memory/CPU cost of going higher.
- pdf.js's `standard_fonts` and `cmaps` ship with the package, with no separate copy step.
- Only the `@napi-rs/canvas-<platform>-<arch>` package matching the machine that ran `npm install` is present, so the app must be packaged on each target platform.
- Packaging is more fragile: see the [build gotchas](../architecture.md#build-gotchas).

## Alternatives considered

- Bundling both packages with Vite: impossible for the native `.node` binary, and unsafe for pdf.js's `legacy` build (itself a webpack bundle).
- No other rendering approach (in the renderer, other libraries) was evaluated.

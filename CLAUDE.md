# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install
npm start           # electron-forge start — runs the app in dev mode with HMR on the renderer
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run package      # electron-forge package — builds the app into out/
npm run make         # electron-forge make — builds platform installers
```

Run a single test file or test by name with Vitest directly, e.g.:

```sh
node_modules/.bin/vitest run src/main/db/library-repository.test.ts
node_modules/.bin/vitest run -t "clamps the current page"
```

CI (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, and `test` as three independent parallel jobs on every push and pull request.

### Dependency vulnerabilities (`npm audit`)

`package.json`'s `overrides` (`tar`, `tmp`) force transitive dependencies of `@electron-forge/*`'s build tooling (`@electron/rebuild`, `@inquirer/prompts`, etc.) up to their patched versions — these fixed everything `npm audit` found except one: `extract-zip` (pulled in by `@electron/packager`, used to unpack Electron's own prebuilt binaries during packaging), which has no patched release at all as of this writing (checked the GHSA advisories directly). `npm audit fix --force` "fixes" this by downgrading `@electron-forge/cli` to 6.4.2 — a real regression, not a fix (7.11.2 is already latest; no available electron-forge release, stable or alpha, resolves it). All of this is dev-only build tooling, never shipped in the packaged app.

## Architecture

Tankōbon is an Electron app (Vite + Electron Forge) for managing and reading digital comics (CBZ, CBR, PDF). It follows the standard Electron three-process split, with a strict boundary enforced by `contextIsolation: true` / `nodeIntegration: false` (see `src/main.ts`):

- **Main process** (`src/main.ts`, `src/main/`) — owns windows, the SQLite database, and all filesystem/archive access.
- **Preload** (`src/preload.ts`) — the *only* bridge between renderer and main. It exposes a single `window.tankobon` object via `contextBridge`, mirroring IPC channels defined in `src/main/ipc/*.ts`. Channel name constants (e.g. `COMIC_CHANNELS`, `LIBRARY_CHANNELS`) live in the main-process IPC files but preload can't import them (different process/build target), so channel strings are duplicated there — keep both sides in sync manually when adding channels.
- **Renderer** (`src/renderer.tsx`, `src/routes/`, `src/hooks/`, `src/components/`) — React 19 UI, talks to main exclusively through `window.tankobon`.
- **Shared types** (`src/shared/*.ts`) — types used on both sides of the IPC boundary (`ComicInfo`, `LibraryEntry`, `AppSettings`). `ArchiveInfo` is what `ComicService` knows about an opened archive before it's matched to a library entry; the IPC handler in `main/ipc/comic.ts` merges that with library data to produce the full `ComicInfo` sent to the renderer.

### Local database (`src/main/db/`)

Persistence uses Node's built-in `node:sqlite` (`DatabaseSync`) — no native module to compile, and nothing stored in the cloud or in Chromium's `localStorage`/IndexedDB. The DB file (`tankobon.db`) lives in Electron's `userData` directory (`database.ts`).

- `library-repository.ts` — one row per comic ever opened (path, title, page count, current page, file count, file size, rating, tags). `touch(filePath, title, pageCount, fileCount, fileSize)` is the upsert used on every `comic:open`: it creates the row on first open or refreshes metadata/clamps `currentPage` if the page count changed — it deliberately never touches `rating`/`tags`, which are user-set and must survive reopening a comic. `updateRating()`/`updateTags()` are the dedicated writers for those two fields. `fileCount` is the archive's total entry count (all files, not just image pages — see `ComicArchive.fileCount` below); `fileSize` is the `.cbz`/`.cbr` file's size on disk, computed via `fs.stat` in `main/ipc/comic.ts` (not inside `ComicArchive`, since size-on-disk isn't something the archive abstraction inherently knows). `tags` is a JSON-encoded `string[]` column — no normalized tags table, since a personal comic library doesn't need one.
- `settings-repository.ts` — generic key/value store (JSON-encoded values) for `AppSettings`, merged with `DEFAULT_SETTINGS` on read so new settings keys don't need a migration.
- `export-service.ts` — builds the JSON snapshot (library + settings) written by the `data:export` IPC handler via a native save dialog.
- Repositories take a `DatabaseSync` instance in their constructor rather than opening it themselves, which is what makes them testable with `new DatabaseSync(':memory:')` in `*.test.ts` files without touching Electron (`app.getPath`) at all.
- `database.ts`'s `migrate()` uses `CREATE TABLE IF NOT EXISTS` for new tables, but that doesn't add columns to an already-existing table — columns added after the initial release (e.g. `file_count`, `file_size`, `rating`, `tags`) go through `addColumnIfMissing()`, which checks `PRAGMA table_info` before an `ALTER TABLE ... ADD COLUMN`, so existing installed databases pick them up without a destructive migration.

**Build gotcha**: `node:sqlite` isn't yet in Node's `builtinModules` list, so Electron Forge's Vite plugin doesn't auto-externalize it for the main-process bundle. It's explicitly listed in `vite.main.config.mts`'s `build.rollupOptions.external` — if that's ever removed, `DatabaseSync` silently becomes `undefined` at runtime (Vite bundles it as an empty stub instead of failing the build).

### Comic archives (`src/main/services/`)

`ComicArchive` (`comic-archive.ts`) is the format-agnostic interface (`pages`, `fileCount`, `readPage()`, `close()`); `CbzArchive` (`node-stream-zip`), `CbrArchive` (`node-unrar-js`), and `PdfArchive` (`pdfjs-dist`) implement it. `fileCount` is every non-directory archive entry (computed in each implementation's `open()`), while `pages` is filtered/sorted down to image entries only — the two commonly differ (e.g. a `ComicInfo.xml` sidecar counts toward `fileCount` but isn't a page; for `PdfArchive` the two are always equal, since a PDF has no equivalent of a sidecar file). `CbzArchive.close()` waits for in-flight `readPage()` calls to settle before closing the zip, and `readPage()` refuses to start once closing has begun: `node-stream-zip` closes its file descriptor immediately, and a read caught mid-way then fails with `EBADF` on an internal piped stream whose error never reaches the `entryData()` promise — it becomes an *uncaught exception in the main process* (the "A JavaScript error occurred in the main process" dialog). This happens routinely from the renderer: switching books while a page is loading, or leaving continuous mode while its preloads are still running (see `cbz-archive.test.ts`). `ComicService` maps file extensions to openers and keeps opened archives alive in memory between IPC calls, addressed by an opaque `randomUUID()` — this id is distinct from the persistent `libraryId` used by the database.

**Build gotcha**: `node-unrar-js`'s Emscripten glue locates its `.wasm` file relative to its own `__dirname`, which breaks once Vite bundles it into `main.js` (the bundle's `__dirname` isn't `node_modules/node-unrar-js/...` anymore). `vite.main.config.mts` copies `unrar.wasm` next to the bundled `main.js` via `vite-plugin-static-copy`, and `cbr-archive.ts` reads it itself (`readFile(join(__dirname, 'unrar.wasm'))`) and passes it as `wasmBinary`, bypassing the library's own path lookup entirely — same category of gotcha as the `node:sqlite` one above.

#### PDF support (`pdf-archive.ts`)

`PdfArchive` has no "native resolution" to defer to (PDF pages are vector content), so it rasterizes each page on demand at a fixed `RENDER_SCALE` of 200/72 (~200 DPI) via `pdfjs-dist`'s `legacy` Node build, returning PNG bytes — high enough to avoid triggering the reader's AI upscaling at normal zoom, without the memory/CPU cost of going much higher.

Rendering needs a Canvas implementation, which Node doesn't have natively. [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) is pdf.js's own optional dependency for exactly this (prebuilt per-platform N-API binary, no native compilation step — same "no native module to compile" property as `node:sqlite`). pdf.js's rendering code references `DOMMatrix`/`Path2D`/`ImageData`/`Image` as bare globals (assuming a browser); `pdf-archive.ts` installs `@napi-rs/canvas`'s implementations of those onto `globalThis` once, before any PDF is touched. `page.render()` also wants the actual `canvas` object (not just its 2D `canvasContext`, which is typed optional-for-backwards-compatibility only) — passing `canvasContext` alone type-checks but pdf.js's newer API expects `canvas`.

**Build gotcha**: unlike `node-unrar-js`, both `pdfjs-dist` and `@napi-rs/canvas` are marked `external` in `vite.main.config.mts` rather than bundled — `@napi-rs/canvas` is a native `.node` binary Rollup can't inline, and `pdfjs-dist`'s `legacy` build is itself a foreign webpack bundle Rollup can't safely re-bundle. Consequence: they stay real npm packages resolved from `node_modules` at runtime (which also means `pdfjs-dist`'s `standard_fonts`/`cmaps` data directories, needed for accurate font substitution, ship for free — no separate asset copy needed, unlike `unrar.wasm`). But the Electron Forge Vite plugin's packaging step only copies its own build output plus `package.json`, never `node_modules` — so `forge.config.ts`'s `hooks.packageAfterCopy` manually copies `pdfjs-dist`, `@napi-rs/canvas`, and whichever `@napi-rs/canvas-<platform>-<arch>` package is actually installed (an npm `optionalDependency`, so only the one matching the machine that ran `npm install` exists on disk) into the packaged app's `node_modules`. The `@electron-forge/plugin-auto-unpack-natives` plugin (installed but previously unused — the default Vite+TS Forge template ships it as a devDependency without wiring it up) then makes sure that copied `.node` binary is unpacked into `app.asar.unpacked` instead of staying stuck inside the (non-dlopen-able) asar archive.

**Another build gotcha**: `pdf-archive.ts` locates `pdfjs-dist`'s package directory via `require.resolve('pdfjs-dist/package.json')`, using the plain ambient `require` — not `createRequire(import.meta.url)`. Vite bundles this file into `main.js` as CommonJS (no `"type": "module"` in `package.json`), and Rollup's CJS output rewrites `import.meta.url` to `{}.url` (i.e. `undefined`), which crashes `createRequire()` at *module load time* (not lazily on first PDF open) — the app fails to start at all. Same underlying reason `cbr-archive.ts` reads its wasm file via `__dirname` rather than a `file://` URL.

### Routing (`src/routes/`)

File-based routes via TanStack Router; `src/routeTree.gen.ts` is auto-generated by the `@tanstack/router-plugin` Vite plugin on build/dev start — never edit it by hand, and don't assume it needs manual updates when adding `validateSearch` to a route (the type-level wiring comes from `preLoaderRoute: typeof <Route>Import` referencing the route file directly). The reader route (`/reader`) accepts an optional `path` search param so the library page can deep-link into opening a specific file.

### Reading direction / RTL

`AppSettings.readingDirection` (`ltr`/`rtl`) flips which physical side of the reader (keyboard arrows and click zones) advances vs. retreats, matching manga (RTL) vs. BD/comics (LTR) conventions — see the `advance`/`retreat` split in `src/routes/reader.tsx`. The underlying `next()`/`prev()` from `useComic` always mean "page index +1/-1" regardless of direction; only the UI-to-action mapping swaps.

### Reading mode: single page vs. continuous scroll

`AppSettings.readingMode` (`single`/`continuous`) picks which component `src/routes/reader.tsx`'s `ReaderPage` renders once a comic is open: `SinglePageReader` (page-by-page, zoom, AI upscaling, wheel-to-turn-page — see below) or `ContinuousReader` (all pages stacked vertically, gap set by `AppSettings.pageSpacing` in px). They're separate components (not branches inside one), each owning its own hooks, so switching modes cleanly mounts/unmounts the right state instead of fighting over shared refs/effects.

`ContinuousReader` renders one `ContinuousPage` per page index; each has two `IntersectionObserver`s: one with a large `rootMargin` that lazily fetches the page (`comic.readPage`) once it's getting close, and one with `threshold: 0.5` that reports the page as "active" for the header's counter and for persisting reading progress (debounced ~400ms, calling `library.updateProgress` directly — deliberately *not* `useComic`'s `goTo`, which would also kick off its own single-page fetch for a `pageUrl` continuous mode never uses). Zoom, AI upscaling, and RTL page-turn direction don't apply here; pages always render top-to-bottom at container width. Known gap: opening a comic in continuous mode always starts at the top rather than scrolling to the resume position (unlike single-page mode, which does resume via `comic.resumePage`).

### Wheel-to-turn-page (single-page mode)

The reader's wheel handler (`src/routes/reader.tsx`, `SinglePageReader`) only turns the page once there's nothing left to scroll in that direction: in "fit" zoom it always turns the page (no scrollable content); when zoomed in, it checks the container's `scrollTop`/`scrollHeight` first and lets the native scroll pan the image, only turning the page once panning is already at that edge. `AppSettings.scrollDirection` (`standard`/`inverted`) picks whether scrolling down calls `advance()` or `retreat()`. A time-based cooldown (~450ms) collapses one trackpad swipe's many `wheel` events into a single page turn. Note for testing: a JS-dispatched `WheelEvent` fires listeners but does not actually scroll the element (no native default action) — verifying real scroll behavior needs CDP's `Input.dispatchMouseEvent` with `type: 'mouseWheel'`, not `element.dispatchEvent(new WheelEvent(...))`.

### Reading progress / pace estimate

`useReadingPace` (`src/hooks/use-reading-pace.ts`) computes the header's "X % · ~Y min" display, shared by `SinglePageReader` and `ContinuousReader` via the `ReadingProgress` component. It tracks pace *for the current session only* (no persisted historical average): given a `sessionKey` (the opened archive's `comic.id`) plus the current page and page count, it resets its internal start time/page whenever `sessionKey` changes — by calling `setState` conditionally during render (React's documented "adjust state while rendering" pattern) rather than in a `useEffect`, so the very first render after opening a book already reflects the new session instead of one render behind. The remaining-time estimate stays `null` (hidden) until enough pages/time have accumulated to be meaningful (see `MIN_ELAPSED_MINUTES`).

### Reader background color

`AppSettings.readerBackground` is a `#rrggbb` string (default `#000000`) applied as an inline `backgroundColor` on the page area of both reader modes; the settings page offers presets (`READER_BACKGROUND_PRESETS` in `src/shared/settings.ts`) plus a native `<input type="color">`. The reader header keeps its own fixed dark chrome (`bg-black text-white`) regardless, and the page-area placeholders/arrows use a mid grey (`text-neutral-500`) so they stay readable on both light and dark backgrounds.

### Sidebar

`AppSettings.sidebarCollapsed` toggles the root layout's sidebar (`src/routes/__root.tsx`) between full width (labels) and an icon-only rail, to reclaim screen space while reading; toggled from a button in the sidebar itself, persisted like any other setting.

### Fullscreen reading

`useFullscreen` (`src/hooks/use-fullscreen.ts`) wraps the HTML Fullscreen API on `document.documentElement` — in Electron that puts the `BrowserWindow` itself in fullscreen, and Chromium handles Escape natively, so no IPC/main-process code is involved. The reader (`useReaderFullscreen` in `src/routes/reader.tsx`) toggles it with the header button or `F`/`F11`, and exits it when the comic is closed or the route unmounts. While fullscreen, the root layout hides the sidebar (`sidebarCollapsed` is left untouched) and `ReaderHeader` becomes an overlay that only appears when the mouse reaches the top edge. It's transient UI state, not an `AppSettings` entry.

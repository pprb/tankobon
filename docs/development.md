# Development

## Prerequisites

- Node.js 22, 22.13 or later (see `.nvmrc`; CI uses Node 22 too): Electron Forge 8 requires it. `node:sqlite` is used by the tests, and runs unflagged on recent Node 22 releases.
- npm (the repository ships a `package-lock.json`).

## Line endings

Every text file uses LF. `.editorconfig` tells editors so, and `.gitattributes` (`* text=auto eol=lf`) makes Git store and check out LF whatever the platform or `core.autocrlf` setting, so a Windows checkout no longer brings CRLF back. After pulling this change into an existing clone, `git add --renormalize .` converts any file still committed with CRLF.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies. |
| `npm start` | `electron-forge start`: runs the app from the sources, with HMR on the renderer. Also regenerates `src/routeTree.gen.ts`. |
| `npm run dev` | The same, in [development mode](#development-mode): the app also restarts by itself when main-process code changes, and opens DevTools. |
| `npm run lint` | ESLint (flat config: `typescript-eslint`, `import-x`, `react-hooks`, `react-refresh`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest, once (`node` environment, no DOM). |
| `npm run package` | `electron-forge package`: builds the app into `out/`. |
| `npm run make` | `electron-forge make`: builds installers for the current platform (Squirrel, ZIP on macOS, deb, rpm). |
| `npm run docs:gen` | Generates the database schema and IPC references, and checks the IPC channels of preload and main agree. |
| `npm run docs:api` | Generates the API reference with TypeDoc; fails on an undocumented export or a broken `{@link}`. |
| `npm run docs:check` | Checks that the npm scripts, file paths and relative links cited in the docs exist. |
| `npm run docs:build` | All of the above, then builds the static site with VitePress into `docs/.vitepress/dist` (fails on a dead link). |
| `npm run docs:dev` | Generates the references, then serves the docs site locally with hot reload. |

Run a single test file or a single test by name with Vitest directly:

```sh
npx vitest run src/main/db/library-repository.test.ts
npx vitest run -t "clamps the current page"
```

## Development mode

`npm run dev` is the command to use while working on the code. What happens on a change depends on the process it belongs to:

| Code changed | Without restarting by hand |
|---|---|
| Renderer (`src/routes/`, `src/components/`, `src/hooks/`, `src/lib/`…) | Hot-replaced by Vite (HMR), the page keeps its state when it can. Same with `npm start`. |
| Preload (`src/preload.ts`) | Rebuilt, then the window reloads. Same with `npm start`. |
| Main process (`src/main.ts`, `src/main/`, `src/shared/`) | Rebuilt, then the whole app restarts (the window closes and reopens). Only in development mode; with `npm start`, type `rs` in the terminal. |

DevTools open (detached) only in development mode; with `npm start` they stay closed but can still be opened from the *View* menu or with `Ctrl+Shift+I`.

How it's wired: `forge.config.ts` recognizes `npm run dev` from `npm_lifecycle_event` and sets `TANKOBON_DEV=1`, which the Electron app inherits from Forge's process; `src/main.ts` opens DevTools when it is set and the app isn't packaged. The restart is a `postStart` hook watching `.vite/build/main.cjs` and calling Forge's own restart (the one `rs` triggers). The Vite plugin's `hotRestart` option is not used: in Forge 8.0 it has no effect, its watch builds running in a subprocess that never receives it.

A restart kills the app without going through `will-quit`, so the database isn't closed cleanly; SQLite handles that, but a long write (a folder scan) is interrupted.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `master` and on every pull request, as independent parallel jobs: `lint`, `typecheck`, `test` and `docs` (`npm run docs:build`).

Four other workflows run on GitHub:

- `.github/workflows/docs.yml` builds the documentation and publishes it to GitHub Pages on every push to `master`.
- `.github/workflows/release-please.yml` maintains a release pull request (version bump + `CHANGELOG.md`) from the Conventional Commits merged into `master`; merging that pull request tags the release.
- `.github/workflows/build.yml` builds the installers of a release tag (`npm run make`) and attaches them to its GitHub release: Squirrel (`.exe`) on Windows, ZIP on macOS (Apple silicon), `.deb` and `.rpm` on Linux. Each platform builds on its own runner, since only the native `@napi-rs/canvas` package of the machine that ran `npm ci` gets packaged (see [Build gotchas](./architecture.md#build-gotchas)). The job fails if the tag isn't `v` + `package.json`'s version. A tag created by release-please doesn't trigger workflows (it is pushed with the default `GITHUB_TOKEN`), so `release-please.yml` calls `build.yml` itself once it has created a release; the `push: tags` trigger covers a `v*` tag pushed by hand (the release is then created if missing), and `workflow_dispatch` rebuilds an existing tag.
- `.github/workflows/pr-title.yml` checks that a pull request's title follows the [commit convention](https://github.com/pprb/tankobon/blob/master/CONTRIBUTING.md), since squash-merging turns it into the commit message on `master`.

Dependabot (`.github/dependabot.yml`) opens one pull request a week, titled `ci(deps): bump …`, when the GitHub Actions used by these workflows have new versions.

## Documentation

The site's sources are in `docs/`:

- hand-written pages: `docs/guide/`, `docs/architecture.md`, `docs/development.md`, `docs/decisions/` (ADRs);
- generated pages, never edited nor committed: `docs/reference/api/` (by TypeDoc), `docs/reference/schema.md` and `docs/reference/ipc.md` (by `scripts/gen-reference.mjs`).

The API reference covers the modules listed in `typedoc.json`'s `entryPoints`. Every exported symbol there must have a TSDoc comment, or `npm run docs:api` fails.

## Dependency audit

The one remaining `npm audit` finding as of 2026-09-30 is in dev-only tooling, never shipped in the packaged app: `esbuild` through `vitepress` 1.x (its bundled Vite 5). The advisory only concerns the dev server (`npm run docs:dev`); the published site is static. It has no fix until VitePress 2 leaves pre-release.

Upgrading Electron Forge to 8 removed the `extract-zip` findings (`@electron/packager` 20 no longer depends on it) and made the former `tar`/`tmp` `overrides` unnecessary; `npm audit fix` took care of `brace-expansion`, `fast-uri` and `ip-address`.

Majors deliberately left behind:

- `@tensorflow/tfjs` stays on `~4.11.0`, the range `upscaler` itself requires.
- TypeScript 7 and `@types/node` above 22: not needed by any fix, to be done as their own change.

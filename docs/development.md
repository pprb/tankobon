# Development

## Prerequisites

- Node.js 22 (see `.nvmrc`; CI uses Node 22 too). `node:sqlite` is used by the tests, and runs unflagged on recent Node 22 releases.
- npm (the repository ships a `package-lock.json`).

## Commands

| Command | What it does |
|---|---|
| `npm install` | Installs dependencies. |
| `npm start` | `electron-forge start`: runs the app in dev mode, with HMR on the renderer. Also regenerates `src/routeTree.gen.ts`. |
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

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `master` and on every pull request, as independent parallel jobs: `lint`, `typecheck`, `test` and `docs` (`npm run docs:build`).

Three other workflows run on GitHub:

- `.github/workflows/docs.yml` builds the documentation and publishes it to GitHub Pages on every push to `master`.
- `.github/workflows/release-please.yml` maintains a release pull request (version bump + `CHANGELOG.md`) from the Conventional Commits merged into `master`; merging that pull request tags the release.
- `.github/workflows/pr-title.yml` checks that a pull request's title follows the [commit convention](https://github.com/pprb/tankobon/blob/master/CONTRIBUTING.md), since squash-merging turns it into the commit message on `master`.

Dependabot (`.github/dependabot.yml`) opens one pull request a week, titled `ci(deps): bump …`, when the GitHub Actions used by these workflows have new versions.

## Documentation

The site's sources are in `docs/`:

- hand-written pages: `docs/guide/`, `docs/architecture.md`, `docs/development.md`, `docs/decisions/` (ADRs);
- generated pages, never edited nor committed: `docs/reference/api/` (by TypeDoc), `docs/reference/schema.md` and `docs/reference/ipc.md` (by `scripts/gen-reference.mjs`).

The API reference covers the modules listed in `typedoc.json`'s `entryPoints`. Every exported symbol there must have a TSDoc comment, or `npm run docs:api` fails.

## Dependency audit

`package.json`'s `overrides` (`tar`, `tmp`) force transitive dependencies of `@electron-forge/*`'s build tooling (`@electron/rebuild`, `@inquirer/prompts`, etc.) up to patched versions. The remaining `npm audit` findings as of 2026-09-30 are all in dev-only tooling, never shipped in the packaged app:

- `extract-zip` (pulled in by `@electron/packager` to unpack Electron's prebuilt binaries) has no patched release. `npm audit fix --force` "fixes" it by downgrading `@electron-forge/cli` to 6.4.2, which is a regression, not a fix.
- `esbuild` through `vitepress` 1.x (its bundled Vite 5): the advisory only concerns the dev server (`npm run docs:dev`); the published site is static.
- `brace-expansion`, `fast-uri` and `ip-address` in lint and build tooling: reported by `npm audit` before the docs tooling was added, not investigated yet.

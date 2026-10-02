---
description: Find the documentation affected by recent code changes, propose updates, and check that documented commands still work
argument-hint: "[base ref — defaults to the last release tag, else the last commit that touched the docs]"
---

Bring the documentation up to date with the code changes since a base point. Work in English (the docs and code comments are in English; UI strings live in `src/locales/`, in English and French).

## 1. Pick the base and read the diff

- If `$ARGUMENTS` is not empty, use it as the base ref.
- Otherwise use the most recent release tag: `git describe --tags --abbrev=0 --match "v*"`.
- If there is no tag, use the last commit that touched the hand-written docs: `git log -1 --format=%H -- README.md CLAUDE.md CONTRIBUTING.md docs/ ':!docs/reference'`.

Say which base you picked and why. Then read `git log --oneline <base>..HEAD` and `git diff <base>...HEAD --stat`, and read the full diff of every file under `src/`, `forge.config.ts`, `vite.*.config.mts`, `package.json`, `.github/workflows/` and `scripts/`. Include uncommitted changes (`git diff HEAD`) if there are any.

## 2. Map the changes to the documentation

Use this map. Read each candidate section before deciding it is affected; don't guess from file names.

| Change in… | Documentation to check |
|---|---|
| User-visible behavior (`src/routes/`, `src/components/`, `src/hooks/`) | `docs/guide/features.md` |
| `src/main/db/` (schema, repositories, import/export, db location) | "Local database" in `docs/architecture.md`; ADRs 0002/0003 |
| `src/main/services/` (archives, scanner) | "Comic archives" and "Folder scanning" in `docs/architecture.md`; ADR 0004 for PDF |
| `src/main/ipc/`, `src/preload.ts`, `src/shared/` | "Processes and boundaries" and "IPC channels" in `docs/architecture.md`; TSDoc of the changed symbols |
| `src/routes/reader.tsx`, `src/lib/wheel-pager.ts`, reader hooks | "Reader" in `docs/architecture.md`; `docs/guide/features.md` |
| `AppSettings` / `DEFAULT_SETTINGS` | `docs/guide/features.md` (where the setting lives in the UI); `docs/architecture.md` |
| `vite.*.config.mts`, `forge.config.ts`, externals, native modules | "Build gotchas" in `docs/architecture.md` |
| `package.json` scripts, `.github/workflows/`, `scripts/` | `docs/development.md`, `CLAUDE.md` (Commands), `README.md`, `CONTRIBUTING.md` |
| A new structural choice (new dependency with constraints, new process boundary, storage change) | a new ADR in `docs/decisions/` from `docs/decisions/template.md` |

The generated reference (`docs/reference/`: API, IPC channels, schema) is never edited: it follows the code. What it needs is TSDoc on every new or changed export in the `typedoc.json` scope, and a `/** … */` on every new `window.tankobon` method.

## 3. Propose the changes

Present a list of proposed edits, grouped by file: for each, the section, what is now wrong or missing, the code that proves it (`path:line`), and the replacement text. Then apply them, with these rules:

- **Edit, don't rewrite.** Change only the sentences the diff makes wrong or incomplete; keep the rest of each hand-written section as it is, including its wording and structure.
- **Only document what you verified in the code.** If the intent of a change is unclear (a behavior that looks like a bug, a decision whose rationale isn't in the code), don't invent a rationale: write the fact and mark it **to be confirmed**, and list it in your final summary.
- An accepted ADR is not rewritten: if a decision changed, write a new ADR that supersedes it and only update the old one's status line.
- Add TSDoc comments where exports lack them; never change application code to make the docs pass.

## 4. Verify

Run, and fix what fails:

1. `npm run docs:build`: generated references, TypeDoc validation (undocumented exports, broken `{@link}`), cited files, npm scripts and test names (`scripts/check-docs.mjs`), IPC channel consistency, VitePress dead links.
2. Every command shown in `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` and `docs/development.md` that is quick and side-effect-free: `npm run lint`, `npm run typecheck`, `npm test`, and each `npx vitest run …` / `npx commitlint` example exactly as written. Don't run `npm start`, `npm run package`, `npm run make` or `docs:dev`; say that they were not run.
3. For any code example in the docs that the diff touches, check it against the current signatures.

## 5. Report

End with: the base used, the files changed and why, the checks run and their results, and the points to be confirmed by the maintainer. Don't commit unless asked; if asked, use one `docs:` commit per subject (Conventional Commits, see `CONTRIBUTING.md`).

---
description: Audit the code base (logic errors, security, dead code, refactorings, best practices, architecture) and write a prioritized report, without changing the code
argument-hint: "[scope: a path such as src/main/ or src/routes/reader.tsx, an axis such as security, or a base ref such as v0.2.1 — defaults to the whole code base]"
---

Audit the code base and produce a prioritized, verified report. This is a **read-only** command: don't modify, commit or push anything unless I explicitly ask afterwards. Work in English internally; **write the final report in French**.

Read `CLAUDE.md` and the relevant sections of `docs/architecture.md` and `docs/decisions/` first: a constraint documented there (a build gotcha, an ADR) is a deliberate choice, not a finding. Challenging one is allowed, but only under "Architecture" and quoting the ADR or section.

## 1. Scope

Interpret `$ARGUMENTS`:

- empty: the whole of `src/`, plus `forge.config.ts`, the `vite.*.config.mts` files, `index.html`, `scripts/` and `.github/workflows/`;
- a path: that file or directory only (still read what it calls and what calls it, to judge it);
- one of `logic`, `security`, `dead-code`, `refactor`, `practices`, `architecture`: that axis only, on the whole code base;
- a git ref (`git rev-parse --verify` succeeds): only the files changed in `git diff <ref>...HEAD`, plus uncommitted changes.

State the scope you picked. Ignore `src/routeTree.gen.ts`, `docs/reference/`, `node_modules/`, `.vite/` and `out/`.

## 2. Automatic signals

Run these and keep their output as leads, not as findings (each lead is verified in step 3):

1. `npm run lint` and `npm run typecheck`.
2. `npm test`: a failing test is a finding in itself.
3. Unused locals and parameters: `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` (not part of the project's config: leads only).
4. Unused exports: for each `export` in scope, `grep -rn` its name in `src/`, `scripts/` and the config files. An export only used by its own `*.test.ts` is dead code tested for nothing; an export kept for TypeDoc (`typedoc.json` scope) is not dead.
5. `npm audit --omit=dev`, compared with the "Dependency audit" section of `docs/development.md` (a known, documented finding is not new).
6. `git log --since="3 months ago" --format= --name-only -- src | sort | uniq -c | sort -rn | head -15`: the most changed files, where bugs and refactoring candidates concentrate. Read those first.

## 3. Review, axis by axis

For a whole-code-base audit, you may hand each axis (or each layer: main, preload, renderer) to a separate subagent and merge their results; give each one this file's section for its axis and the scope. Otherwise read the code yourself. Either way, **every finding is verified against the code before it goes in the report**: read the lines, follow the callers, and, when it's cheap, prove it with a failing `npx vitest run` test written in the scratchpad (never in the repository). A hunch you could not confirm goes under "To be confirmed", never with the confirmed findings.

### Logic errors

- Async: unawaited promises, races between an IPC call and an unmount or a book switch, resources closed while a read is in flight (see "CBZ: closing while reading" in `docs/architecture.md` for the pattern), shared state between concurrent calls (the CBR wasm module, `ThumbnailCache`'s queue).
- React: effects with missing or unstable dependencies, stale closures in event listeners, state updated after unmount, observers and listeners not cleaned up, keys that don't reset what they should.
- Database: the three library writers (`touch()`, `register()`, `upsert()`) keeping their documented rules, explicit deletions (foreign keys are off), positions with gaps, `COLLATE NOCASE` matches, transactions around multi-statement writes.
- Boundaries: off-by-one on page indexes (`current_page` vs page count, RTL), empty library, empty list, `MAX_READING_LIST_SIZE`, a file deleted or moved since it was added, dates with partial precision.
- Error paths: a `catch` that swallows, an IPC handler that throws where the convention is a `{ status: 'error', message }` result.

### Security

This is an Electron app reading untrusted files (archives, PDFs), untrusted JSON (imports) and untrusted HTML (Bédéthèque pages). Check:

- The window's `webPreferences` in `src/main.ts` (`contextIsolation`, `nodeIntegration`, `sandbox`, no `webSecurity: false`), navigation and `window.open` handling, the CSP in `index.html` (each `img-src`/`connect-src` origin justified).
- `src/preload.ts`: only narrow, typed functions are exposed, never `ipcRenderer` itself or a generic `invoke(channel, …)`.
- Every `ipcMain.handle` in `src/main/ipc/`: arguments validated as if a compromised renderer sent them (types, ids, and above all **file paths**: can the renderer make main read, write or delete an arbitrary file?). `shell.openExternal` only with fixed URLs (`APP_LINKS`).
- SQL built by string concatenation or template literals instead of bound parameters.
- Archives: path traversal in entry names, decompression bombs (entry count, total size, image dimensions), malformed PDFs; `src/main/services/`.
- Import: `parseExport()` trusting nothing (prototype pollution through `__proto__` keys, huge arrays, wrong types).
- Network: timeouts, response size limits, the scraped HTML never reaching the renderer as markup (`dangerouslySetInnerHTML`), API keys never logged nor sent to the renderer beyond the settings page.
- Secrets or personal paths committed in the repository; dependencies with known advisories that ship in the packaged app.

### Dead code

Unused exports, files, components, hooks, settings keys (in `AppSettings` but never read), IPC channels exposed by the preload but never called by the renderer (or handled in main but never exposed), CSS classes, dependencies in `package.json` imported nowhere, commented-out code, `TODO`s that are already done. Check the IPC channels with the same lists `npm run docs:gen` compares.

### Possible refactorings

Duplicated logic (between the three archive implementations, the metadata clients, the reading-list and library repositories, the settings sections), components over ~300 lines or doing several jobs, logic sitting in a component or an IPC handler that could be a pure, tested helper in `src/lib/` or `src/shared/` (the project's own convention), long parameter lists, types widened to `any`/`unknown` then cast. Only propose a refactoring whose gain you can state in one sentence; "cleaner" is not a gain.

### Best practices

Against the project's own conventions first (`CLAUDE.md` "Conventions" and "Documentation rule"): French user-facing strings and English code, `@/` imports in the renderer only, result unions for user errors, `addColumnIfMissing()` for new columns, TSDoc on exports in the TypeDoc scope, colocated tests. Then general ones: missing tests for pure logic that has branches, accessibility of the UI (labels, keyboard access, focus in dialogs), error messages a user can act on, performance traps (N+1 queries, a whole library re-rendered on each keystroke, archives opened in parallel).

### Architecture evolutions

Step back from the lines: what will hurt as the app grows (library size, new formats, new metadata sources, sync between machines, a people page)? Look at the process boundaries, the IPC surface, the database schema and its migrations, the renderer's data loading (everything from one `library:list`), the test strategy (nothing covers the renderer components). For each proposal: the problem it solves (with evidence from the code), the change, its cost, and whether it would need an ADR (`docs/decisions/template.md`). Propose at most five, ranked; don't redesign what works.

## 4. Report

Write the report in French, in this structure:

1. **Résumé**: scope, checks run and their result, counts per axis and severity, the three things to fix first.
2. **One section per axis**, findings sorted by severity (**critique**, **haute**, **moyenne**, **basse**). Each finding has: a short title, `path:line`, what is wrong, a concrete scenario that triggers it (input → wrong result), the proposed fix (a few lines of diff when it's small), and the effort (S/M/L).
3. **Architecture**: the ranked proposals as described above.
4. **À confirmer**: what you suspect but couldn't prove, and what would settle it.
5. **Plan proposé**: the findings grouped into independent changes, each one a future pull request with a Conventional Commits title (`fix(reader): …`, `refactor(db): …`), smallest and most severe first.

Write the report to the scratchpad as a Markdown file as well as in the chat, and keep the chat version short if the report is long (summary, top findings, plan; the rest in the file). Don't post it anywhere, and don't start fixing: I'll pick which changes to make.

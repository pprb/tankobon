# 0009. Validation of IPC arguments, and no filesystem paths from the renderer

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

[ADR 0001](./0001-electron-process-isolation.md) keeps the renderer sandboxed and makes the preload the only bridge, but it says nothing about what crosses that bridge. Until now each `ipcMain.handle` callback trusted its arguments: the TypeScript signatures of `window.tankobon` are erased at runtime, so a compromised or simply buggy renderer could send a number where a string is expected, an unknown settings key, a malformed `MetadataUpdate`, or, with `comic:open`, any path on the disk (the main process would open it as an archive and register it in the library). With 30-odd channels, every new one was one more chance to forget a check.

## Decision

- **Every handler goes through `handle(channel, validate, fn)`** (`src/main/ipc/handle.ts`), never through `ipcMain.handle` directly. `validate` checks the whole argument list; when it refuses it, the call is rejected with an error and `fn` never runs. `scripts/gen-reference.mjs` counts a channel as handled only through `handle()`.
- **The validators are hand-written, pure and shared**, in `src/shared/validation.ts`: scalar guards (`isId`, `isIndex`, `isRating`, `isText`), `arrayOf()`, structured guards (`isMetadataUpdate`, `isMetadataQuery`, `isSettingValue`) and `tuple()`, which builds a handler's argument-list guard from one guard per argument (exact arity). Settings are checked against the key they are written under: the type of the default, and for the constrained ones a value the app understands (language, direction, `#rrggbb` colour…). The JSON import uses the same `isSettingValue()`.
- **The renderer never names a filesystem path.** `comic:pick-file` returns an opaque token for the file the user picked in the native dialog (the main process remembers token → path); `comic:open` takes either such a token or a library entry id, and refuses anything else. The reader's `book` search param (previously `path`) carries one of those two.

## Consequences

- A new channel can't skip validation by omission: it is written with `handle()`, whose signature requires a guard, and its handler's arguments are typed from it. `tuple()` with no guard documents "no argument".
- Validation is about shape and range, not about whether an id exists: an unknown id is still answered by the repository (`null`, a result error…) as before.
- An invalid call is a bug or an attack, not a user-facing failure, so it rejects instead of returning a `{ status: 'error' }` member; those stay reserved for the failures a user can cause.
- Opening a comic from the renderer is no longer possible for a file that is neither in the library nor just picked; there is no "open this path" call to forge. A token only lives as long as the main process.
- Hand-written guards mean a bit of code per structured argument (`MetadataUpdate`), and `isMetadataUpdate()` must follow the type when a field is added; `validation.test.ts` covers the accepted and refused shapes.

## Alternatives considered

- **A schema library (zod…)**: declarative and infers types, but adds a dependency to both bundles for about a dozen shapes, and the project prefers pure helpers it can read in one file.
- **Checking inside each handler**: what was there; nothing makes it happen for the next channel.
- **Validating only the format of the path in `comic:open`** (absolute, supported extension): cheap, but still lets the renderer open any file with that extension.

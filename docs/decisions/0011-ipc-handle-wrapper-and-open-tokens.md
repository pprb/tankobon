# 0011. A mandatory `handle()` wrapper for IPC, and opaque tokens instead of paths

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

[ADR 0009](./0009-ipc-argument-validation.md) made every handler check what the renderer sends, with the guards of `src/main/ipc/validate.ts`, called by hand inside each handler. Nothing forces the next handler to do it: a new channel written with plain `ipcMain.handle` and parameters typed `unknown` that are simply used would compile. And `comic:open` still takes a filesystem path from the renderer: it is checked against the library and the last file picked, but the renderer names paths, so the check is the only thing between it and the disk.

## Decision

- **Every handler is registered with `handle(channel, parse, fn)`** (`src/main/ipc/handle.ts`). `parse` turns the raw argument list into the typed one `fn` receives, or throws an `IpcArgumentError` (rejecting the call without `fn` running). It is built with `args(...)` (`validate.ts`) from one parser per argument, which also refuses a wrong number of arguments; `args()` alone is the parser of a channel without arguments. The parsers are the ADR 0009 guards. Registering a handler without a parser doesn't type-check, and `scripts/gen-reference.mjs` only counts a channel as handled through `handle()`.
- **The renderer never names a path.** `comic:pick-file` returns an opaque token for the file picked in the native dialog (the main process keeps token → path for its lifetime), and `comic:open` takes that token or a library entry id. Anything else answers with an `OpenComicResult` error (a stale id is a user-facing case, not a hostile call). The reader's `book` search param (formerly `path`) carries one or the other. This replaces ADR 0009's rule "a path of the library or the last file picked".

## Consequences

- A new channel cannot skip validation by omission, and its handler's arguments are typed by its parser.
- There is no call that opens an arbitrary path any more, whatever its validation.
- A token only lives as long as the main process; once a picked book is opened it is in the library, so its id works from then on.

## Alternatives considered

- **Keeping the validation inside each handler** (ADR 0009 as shipped): works today, relies on review for tomorrow.
- **A schema library**: rejected for the reasons of ADR 0009.
- **Validating only the format of the path in `comic:open`**: still lets the renderer read any file with a supported extension.

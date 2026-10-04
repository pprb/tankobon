# 0013. One renderer data store, kept current by a `data:changed` push

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

Until now each view fetched what it needed when it mounted: `library:list` in five places (the library page, both reading-list pages, the "clear library" confirmation, the reader's "next book"), `readingLists:list` in five more, and one copy of the settings per `useSettings()` instance. Views that write something the others show had to say so by hand: `notifyReadingListsChanged()` (an `EventTarget` in the renderer) was called from seven places, and forgetting one left a stale sidebar. Anything done outside a view's own code (a folder scan, a data import, a book opened in the reader) was only seen when a view happened to reload.

The library page also drew every row and, on each keystroke of the search field, filtered and re-rendered all of them. The target is now a library of 20 000 books or more, where a full `library:list` per page change, one DOM row per book and a text normalization per entry per keystroke are all noticeable.

## Decision

- **One store in the renderer** (`DataStore`, `src/lib/data-store.ts`, pure and unit-tested; the instance is `appData`, `src/lib/app-data.ts`) holds the library, the reading lists and the settings, each a *slice* with its own subscribers. Views read it through `useLibrary()`, `useReadingLists()` and `useSettings()` (`useSyncExternalStore`, no provider) and never call `library:list`, `reading-lists:list` or `settings:get-all` themselves. Slices are immutable: a change replaces the array or object, so they are valid `useMemo` dependencies.
- **The main process announces every write** with a `data:changed` push (main → renderer, like `library:scan-progress`), sent by the IPC handlers right after the repository call through an injected `NotifyDataChange`. The payload is a `DataChange` (`src/shared/data-changes.ts`): for single-entry writes (rating, tags, progress, metadata, opening a book, removal) the library change *carries the new entries* or the removed ids, so the renderer neither reloads nor makes an extra request; for bulk writes (folder scan, import, clearing) it carries nothing and the renderer reloads the slice. Reading lists are small, so their change always means "reload". A setting change carries the written value.
- **The echo of the renderer's own writes is ignored while they are in flight.** Rating clicks and slider drags update the store at once (optimistic), then call the main process; the store marks the entry or setting as pending until the call resolves and drops `data:changed` values for it meanwhile (the event arrives before the call's reply), so a late echo can't move a slider back.
- **The library list is virtualized** with `@tanstack/react-virtual` (rows have varying heights, which it measures), inside its own scroll container, and the search is cheap per keystroke: the normalized searchable text of each entry is cached (`WeakMap`, valid because entries are replaced, never mutated), and the filtering is deferred (`useDeferredValue`) so the field stays responsive.
- **Filtering stays in the renderer**, on the whole library held in memory. Moving search and filters into SQL would be the next step beyond a few tens of thousands of books; it isn't needed yet and would not change this store's role.

## Consequences

- A new write path needs one line, the `notify(…)` call in its handler, to reach every view; no view code changes. A new view reads a hook instead of fetching and subscribing.
- The whole library crosses IPC once at start-up (and after a bulk write) instead of once per page change.
- The library is held once in memory in the renderer, as arrays of entries; replacing one entry copies the array (O(n), negligible at this size).
- Views must treat what hooks return as read-only and handle `null` (not loaded yet) for the library and the lists.
- Rows scrolled out of view are unmounted, so local row state (a half-typed new tag) is lost when scrolling away.
- The ordering `lastOpenedAt DESC` of `library:list` is reproduced in the renderer when an entry changes (`applyLibraryChange()`); a tie in dates may order differently from SQLite until the next full reload.

## Alternatives considered

- **A React context holding the state**: needs a provider and re-renders every consumer on any change, unless split into several contexts; a store with `useSyncExternalStore` gives per-slice subscriptions with no provider, and is testable without React.
- **A data-fetching library (TanStack Query)** with invalidation: its caching and refetch model is built for remote servers; here the source of truth is the local main process, which can push exactly what changed.
- **Reloading the slice on every `data:changed`**: simplest, but a progress update on each page turn would send the whole library over IPC. Carrying the changed entries avoids that.
- **`react-window`**: fixed-size rows are its comfortable case; the rows here vary in height (wrapping tags, optional metadata line).
- **Filtering in SQL now**: more code (a query builder over title, path, series, credits, tags, rating) for a size the in-memory path handles; kept as a later step.

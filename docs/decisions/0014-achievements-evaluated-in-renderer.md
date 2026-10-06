# 0014. Achievements evaluated in the renderer, only unlocks persisted

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Achievements reward reading and organizing the library. Most are a count over data the renderer already holds in its [data store](./0013-renderer-data-store-data-changed.md) (books finished, books in the library, lists, ratings, tags); a few depend on the moment a book is opened (at night, early, in right-to-left). The app keeps no reading history, and the maintainer did not want one for this: streaks, "N books in a row" and long-session achievements are therefore out of scope.

## Decision

- **The rules live in the renderer** (`src/lib/achievements.ts`), pure and unit-tested, over the store's slices. The main process owns no rule: it only stores which achievements were earned and when (`achievements` table, migration 6) and announces new ones with `data:changed`.
- **Only unlocks are persisted.** An achievement stays earned when the books that earned it are removed or the library is cleared, and its date never changes (`INSERT OR IGNORE`).
- **The renderer asks the main process to record an unlock** (`achievements:unlock`), which accepts only ids of `ACHIEVEMENT_IDS`. The renderer is trusted for *when* (as it already is for reading progress), not for *what*.
- **Event achievements** are decided from the clock and the reading direction when the reader opens a book, with no stored history.
- **A toast announces** what is earned after the window loads; many at once are summed up in one.

## Consequences

- No write path needs to know about achievements, and a new rule is one entry in `ACHIEVEMENT_RULES` plus its texts and badge.
- Achievements are earned while a window is open: books added by a start-up resynchronization are counted the next time the root layout evaluates, i.e. at once, since it runs on every change of the library.
- An achievement earned on one machine isn't carried by the JSON export: a restored library earns them again by the same rules, except the event ones.
- A renderer could unlock anything; acceptable for a local, single-user app with no competitive element.

## Alternatives considered

- **Evaluating in the main process** after every write: a hook in each handler and a second copy of the filtering helpers (`isFinished()`, tags) in `src/main/`, for no benefit.
- **Deriving everything and persisting nothing:** removing books would lose achievements, and event achievements couldn't exist.
- **A reading-history table** for streaks and marathons: declined for now; it would be a new migration and a new ADR.

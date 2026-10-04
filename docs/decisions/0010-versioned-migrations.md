# 0010. Schema migrations versioned with `PRAGMA user_version`

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

[ADR 0002](./0002-local-storage-node-sqlite.md) migrates the schema in place at startup with `CREATE TABLE IF NOT EXISTS` and `addColumnIfMissing()`. That covers new tables and columns, but not indexes or data migrations (rewriting existing rows), and nothing records which changes a given database already went through. The author page needs an index on `credits(person_id)`, and an SQL-side search would want indexes on `title` and `series`.

## Decision

- `src/main/db/schema.ts` holds an ordered `MIGRATIONS` list (`version`, `run(db)`). `migrate()` reads `PRAGMA user_version` and applies, in order, every migration with a higher version.
- Each migration runs through `withTransaction()` together with its `PRAGMA user_version = N`, so a failure leaves the database at the last fully applied version.
- Migration 1 is everything that existed before versioning (the tables and the `addColumnIfMissing()` columns), kept idempotent: an installed database is at version 0 and goes through it without harm. Migration 2 adds `idx_credits_person_id`.
- A shipped migration is never edited or reordered; a schema change is a new entry at the end.
- A database whose version is ahead of the build (written by a newer release) is left untouched rather than refused, since migrations are additive.

## Consequences

- Indexes and data fixes now have a place, and run exactly once.
- `scripts/gen-reference.mjs` builds the schema reference by running the literal SQL of `schema.ts` in file order, and lists the indexes.
- Destructive changes (renaming or dropping a column) are still not covered by `addColumnIfMissing()`, but a migration can now do them in a transaction.
- Opening a database with an older build after a newer one migrated it is not guarded against.

## Alternatives considered

- **A `schema_migrations` table**: more flexible (names, dates), but one integer is enough for a linear history in a single-user local file.
- **Keeping idempotent `IF NOT EXISTS` steps only**: runs every step on every start and can't express a one-time data fix.

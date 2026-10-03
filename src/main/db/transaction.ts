/**
 * Transaction helper shared by the repositories and the JSON import.
 * @module
 */
import type { DatabaseSync } from 'node:sqlite';

/**
 * Runs `fn` in a transaction: committed when it returns, rolled back (and the error rethrown)
 * when it throws. Without one, SQLite commits every statement on its own, which is slow for a
 * batch (an import of 2 000 books) and leaves a half-written state when a write fails midway.
 *
 * Calls nest: inside a transaction already open on `db` (the import wrapping the repositories'
 * own transactions), `fn` simply joins it, and only the outermost call commits or rolls back.
 */
export function withTransaction<T>(db: DatabaseSync, fn: () => T): T {
  if (db.isTransaction) {
    return fn();
  }
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

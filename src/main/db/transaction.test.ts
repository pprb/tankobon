import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { withTransaction } from './transaction';

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE t (n INTEGER)');
  return db;
}

const count = (db: DatabaseSync): number => (db.prepare('SELECT COUNT(*) AS c FROM t').get() as { c: number }).c;

describe('withTransaction', () => {
  it('commits and returns the result', () => {
    const db = createDatabase();
    const result = withTransaction(db, () => {
      db.exec('INSERT INTO t VALUES (1)');
      return 'done';
    });
    expect(result).toBe('done');
    expect(count(db)).toBe(1);
    expect(db.isTransaction).toBe(false);
  });

  it('rolls back and rethrows when the callback throws', () => {
    const db = createDatabase();
    expect(() =>
      withTransaction(db, () => {
        db.exec('INSERT INTO t VALUES (1)');
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(count(db)).toBe(0);
    expect(db.isTransaction).toBe(false);
  });

  it('joins the outer transaction: an inner success is rolled back with the outer failure', () => {
    const db = createDatabase();
    expect(() =>
      withTransaction(db, () => {
        withTransaction(db, () => db.exec('INSERT INTO t VALUES (1)'));
        throw new Error('outer');
      }),
    ).toThrow('outer');
    expect(count(db)).toBe(0);
  });
});

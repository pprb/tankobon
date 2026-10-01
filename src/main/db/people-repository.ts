/**
 * Persistence of the people credited on books (the `people` table).
 * @module
 */
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

import type { PersonName } from '../../shared/library';

/** A row of the `people` table. */
export interface Person extends PersonName {
  id: string;
  /** Nationality as free text; no source fills it yet, it is kept for a future author page. */
  nationality: string | null;
}

/**
 * Persists people (writers, artists…) once each, shared by every book that credits them. A person
 * is identified by first and last name, case-insensitively: two different authors with the same
 * name would be merged, which a personal library can live with.
 */
export class PeopleRepository {
  constructor(private readonly db: DatabaseSync) {}

  /** The person with this name, created if it doesn't exist yet. Names are trimmed first. */
  findOrCreate(name: PersonName): Person {
    const firstName = name.firstName.trim();
    const lastName = name.lastName.trim();
    const existing = this.db
      .prepare('SELECT id, first_name, last_name, nationality FROM people WHERE first_name = ? AND last_name = ?')
      .get(firstName, lastName) as
      | { id: string; first_name: string; last_name: string; nationality: string | null }
      | undefined;
    if (existing) {
      return {
        id: existing.id,
        firstName: existing.first_name,
        lastName: existing.last_name,
        nationality: existing.nationality,
      };
    }
    const id = randomUUID();
    this.db.prepare('INSERT INTO people (id, first_name, last_name) VALUES (?, ?, ?)').run(id, firstName, lastName);
    return { id, firstName, lastName, nationality: null };
  }
}

/**
 * Persistence of the achievements the user has earned (the `achievements` table).
 * @module
 */
import type { DatabaseSync } from 'node:sqlite';

import { isAchievementId, type AchievementId, type UnlockedAchievement } from '../../shared/achievements';
import { withTransaction } from './transaction';

/** The earned achievements, which stay earned when the books that earned them are removed. */
export class AchievementRepository {
  constructor(private readonly db: DatabaseSync) {}

  /** Every achievement earned, the earliest first; a stored id this build doesn't know is skipped. */
  list(): UnlockedAchievement[] {
    const rows = this.db.prepare('SELECT id, unlocked_at FROM achievements ORDER BY unlocked_at, id').all() as {
      id: string;
      unlocked_at: string;
    }[];
    return rows.flatMap((row) => (isAchievementId(row.id) ? [{ id: row.id, unlockedAt: row.unlocked_at }] : []));
  }

  /** Records `ids` as earned now; those already earned keep their date. Returns the new ones only. */
  unlock(ids: readonly AchievementId[], at = new Date()): UnlockedAchievement[] {
    const insert = this.db.prepare('INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)');
    const unlockedAt = at.toISOString();
    const added: UnlockedAchievement[] = [];
    withTransaction(this.db, () => {
      for (const id of new Set(ids)) {
        if (Number(insert.run(id, unlockedAt).changes) > 0) added.push({ id, unlockedAt });
      }
    });
    return added;
  }
}

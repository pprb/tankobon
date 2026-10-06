import { isAchievementId, type AchievementId } from '../../shared/achievements';
import type { AchievementRepository } from '../db/achievement-repository';
import type { NotifyDataChange } from './data-changes';
import { handle } from './handle';
import { args, expectStringArray, IpcArgumentError } from './validate';

// Channel names are shared with preload.ts: keep them in sync.
export const ACHIEVEMENT_CHANNELS = {
  list: 'achievements:list',
  unlock: 'achievements:unlock',
} as const;

const achievementIdsArg = (value: unknown): AchievementId[] => {
  const ids = expectStringArray(value, 'ids');
  const unknown = ids.find((id) => !isAchievementId(id));
  if (unknown !== undefined) throw new IpcArgumentError('ids', 'known achievement ids');
  return ids as AchievementId[];
};

export function registerAchievementsIpc(repo: AchievementRepository, notify: NotifyDataChange): void {
  handle(ACHIEVEMENT_CHANNELS.list, args(), () => repo.list());

  handle(ACHIEVEMENT_CHANNELS.unlock, args(achievementIdsArg), (_event, ids) => {
    const unlocked = repo.unlock(ids);
    if (unlocked.length > 0) notify({ scope: 'achievements', unlocked });
    return unlocked;
  });
}

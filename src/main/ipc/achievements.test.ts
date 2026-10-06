import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = new Map<string, (event: unknown, ...raw: unknown[]) => unknown>();
vi.mock('electron', () => ({ ipcMain: { handle: (channel: string, fn: (event: unknown, ...raw: unknown[]) => unknown) => handlers.set(channel, fn) } }));

import { AchievementRepository } from '../db/achievement-repository';
import { migrate } from '../db/schema';
import { ACHIEVEMENT_CHANNELS, registerAchievementsIpc } from './achievements';

describe('achievements IPC', () => {
  const notify = vi.fn();

  beforeEach(() => {
    handlers.clear();
    notify.mockClear();
    const db = new DatabaseSync(':memory:');
    migrate(db);
    registerAchievementsIpc(new AchievementRepository(db), notify);
  });

  const call = (channel: string, ...raw: unknown[]) => handlers.get(channel)!({}, ...raw);

  it('stores new achievements and announces only those', () => {
    const first = call(ACHIEVEMENT_CHANNELS.unlock, ['firstBook', 'nightOwl']) as { id: string }[];
    expect(first.map((a) => a.id)).toEqual(['firstBook', 'nightOwl']);
    expect(notify).toHaveBeenCalledWith({ scope: 'achievements', unlocked: first });

    notify.mockClear();
    expect(call(ACHIEVEMENT_CHANNELS.unlock, ['firstBook'])).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    expect((call(ACHIEVEMENT_CHANNELS.list) as unknown[]).length).toBe(2);
  });

  it('refuses an unknown id', () => {
    expect(() => call(ACHIEVEMENT_CHANNELS.unlock, ['nope'])).toThrow(/known achievement ids/);
  });
});

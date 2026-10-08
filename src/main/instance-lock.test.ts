import { describe, expect, it } from 'vitest';

import { acquireInstanceLock, isRelaunch, RELAUNCH_FLAG, relaunchArgs } from './instance-lock';

describe('relaunch arguments', () => {
  it('flags the arguments once, without the executable', () => {
    const args = relaunchArgs(['app', '--foo']);
    expect(args).toEqual(['--foo', RELAUNCH_FLAG]);
    expect(relaunchArgs(['app', ...args])).toEqual(['--foo', RELAUNCH_FLAG]);
  });

  it('recognizes a relaunched process', () => {
    expect(isRelaunch(['app', RELAUNCH_FLAG])).toBe(true);
    expect(isRelaunch(['app'])).toBe(false);
  });
});

describe('acquireInstanceLock', () => {
  it('gives a normal start a single try', async () => {
    let calls = 0;
    expect(await acquireInstanceLock(() => (calls++, false), false)).toBe(false);
    expect(calls).toBe(1);
  });

  it('lets a relaunched process wait for the old one to release the lock', async () => {
    let calls = 0;
    const result = await acquireInstanceLock(() => ++calls >= 3, true, { intervalMs: 1 });
    expect(result).toBe(true);
    expect(calls).toBe(3);
  });

  it('gives up after the timeout', async () => {
    expect(await acquireInstanceLock(() => false, true, { timeoutMs: 20, intervalMs: 5 })).toBe(false);
  });
});

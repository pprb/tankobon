/**
 * Single instance and relaunch. `app.relaunch()` starts the new process while the old one is still
 * shutting down, and the two then share the profile (`userData`) for a moment: on Windows the new
 * window came up blank. The relaunched process therefore waits for the old one to release the
 * single-instance lock before it goes any further.
 * @module
 */

/** Command-line flag added to the arguments of a relaunched process. */
export const RELAUNCH_FLAG = '--tankobon-relaunch';

/** How long a relaunched process waits for the previous one to be gone. */
const WAIT_TIMEOUT_MS = 15_000;
const WAIT_INTERVAL_MS = 100;

/** Whether this process was started by {@link relaunchArgs}. */
export function isRelaunch(argv: readonly string[]): boolean {
  return argv.includes(RELAUNCH_FLAG);
}

/** The arguments a relaunched process gets: the current ones, flagged once. */
export function relaunchArgs(argv: readonly string[]): string[] {
  return [...argv.slice(1).filter((arg) => arg !== RELAUNCH_FLAG), RELAUNCH_FLAG];
}

/**
 * Takes the single-instance lock. A normal start gets one try (false: another instance is
 * running); a relaunched process keeps trying until the process it replaces has exited, or
 * until the timeout.
 */
export async function acquireInstanceLock(
  tryLock: () => boolean,
  relaunched: boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<boolean> {
  const { timeoutMs = WAIT_TIMEOUT_MS, intervalMs = WAIT_INTERVAL_MS } = options;
  const deadline = Date.now() + timeoutMs;
  while (!tryLock()) {
    if (!relaunched || Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return true;
}

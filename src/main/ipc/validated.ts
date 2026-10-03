/**
 * Argument validation for IPC handlers, kept free of Electron imports so it can be unit-tested.
 * @module
 */
import type { IpcMainInvokeEvent } from 'electron';

import { t } from '../../shared/i18n';

/** Checks the whole list of arguments a channel received; see `tuple()` in `src/shared/validation.ts`. */
export type ArgsGuard<A extends unknown[]> = (args: unknown[]) => args is A;

/**
 * Wraps `fn` so that it only runs when `validate` accepts the arguments; otherwise the call is
 * rejected and `fn` never sees them. Pure (no Electron), so it is unit-tested.
 */
export function validated<A extends unknown[], R>(
  channel: string,
  validate: ArgsGuard<A>,
  fn: (event: IpcMainInvokeEvent, ...args: A) => R,
): (event: IpcMainInvokeEvent, ...args: unknown[]) => R {
  return (event, ...args) => {
    if (!validate(args)) {
      throw new Error(t('errors:ipc.invalidArguments', { channel }));
    }
    return fn(event, ...args);
  };
}

/**
 * The one way to register an IPC handler: the arguments are parsed before the handler runs.
 * See ADR 0009.
 * @module
 */
import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import type { ArgsParser } from './validate';

/**
 * `ipcMain.handle()` that cannot be written without argument validation: `parse` (built with
 * `args()` from the guards of `validate.ts`) turns the raw arguments into the typed ones `fn`
 * receives, or throws an `IpcArgumentError` and the call is rejected without `fn` running.
 */
export function handle<A extends unknown[], R>(
  channel: string,
  parse: ArgsParser<A>,
  fn: (event: IpcMainInvokeEvent, ...args: A) => R,
): void {
  ipcMain.handle(channel, (event, ...raw: unknown[]) => fn(event, ...parse(raw)));
}

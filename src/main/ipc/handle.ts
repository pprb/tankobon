/**
 * The one way to register an IPC handler: the arguments are validated before the handler runs.
 * See ADR 0009.
 * @module
 */
import { ipcMain, type IpcMainInvokeEvent } from 'electron';

import { validated, type ArgsGuard } from './validated';

/**
 * `ipcMain.handle()` with argument validation: every handler of `src/main/ipc/` goes through it, so
 * nothing the renderer sends reaches a repository, the filesystem or the network unchecked. An
 * invalid call rejects with an error; the handler's own, user-facing failures stay result unions.
 */
export function handle<A extends unknown[], R>(
  channel: string,
  validate: ArgsGuard<A>,
  fn: (event: IpcMainInvokeEvent, ...args: A) => R,
): void {
  ipcMain.handle(channel, validated(channel, validate, fn));
}

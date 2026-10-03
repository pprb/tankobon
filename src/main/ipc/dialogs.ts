import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';

/**
 * Shows an open dialog, modal to the window that sent `event` when there is one (the window may
 * be gone by the time the handler runs).
 */
export function openDialogFor(
  event: IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions,
): Promise<Electron.OpenDialogReturnValue> {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options);
}

/** Like {@link openDialogFor}, for a save dialog. */
export function saveDialogFor(
  event: IpcMainInvokeEvent,
  options: Electron.SaveDialogOptions,
): Promise<Electron.SaveDialogReturnValue> {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options);
}

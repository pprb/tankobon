import { app, ipcMain, shell } from 'electron';

import { APP_LINKS, isAppLink, type AppInfo } from '../../shared/app';

// Channel names are shared with preload.ts: keep them in sync.
export const APP_CHANNELS = {
  getInfo: 'app:get-info',
  openLink: 'app:open-link',
} as const;

/**
 * Information shown in the "À propos" settings section. The versions are read here rather than in
 * the preload: `app.getVersion()` only exists in the main process.
 */
export function registerAppIpc(): void {
  ipcMain.handle(
    APP_CHANNELS.getInfo,
    (): AppInfo => ({
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      platform: process.platform,
      arch: process.arch,
    }),
  );

  // Only the project's own pages, named by key: the renderer never hands a URL to `openExternal`.
  ipcMain.handle(APP_CHANNELS.openLink, async (_event, link: unknown) => {
    if (isAppLink(link)) {
      await shell.openExternal(APP_LINKS[link]);
    }
  });
}

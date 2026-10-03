import { app, shell } from 'electron';

import { APP_LINKS, isAppLink, type AppInfo } from '../../shared/app';
import { tuple } from '../../shared/validation';
import { handle } from './handle';

// Channel names are shared with preload.ts: keep them in sync.
export const APP_CHANNELS = {
  getInfo: 'app:get-info',
  getSystemLanguages: 'app:get-system-languages',
  openLink: 'app:open-link',
} as const;

/**
 * Information shown in the "À propos" settings section. The versions are read here rather than in
 * the preload: `app.getVersion()` only exists in the main process.
 */
export function registerAppIpc(): void {
  handle(APP_CHANNELS.getInfo, tuple(), (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    v8: process.versions.v8,
    platform: process.platform,
    arch: process.arch,
  }));

  // The OS's preferred languages, for the renderer to resolve the `system` language setting
  // exactly as the main process does (see `applyMainLanguage()`).
  handle(APP_CHANNELS.getSystemLanguages, tuple(), (): string[] => app.getPreferredSystemLanguages());

  // Only the project's own pages, named by key: the renderer never hands a URL to `openExternal`.
  handle(APP_CHANNELS.openLink, tuple(isAppLink), async (_event, link) => {
    await shell.openExternal(APP_LINKS[link]);
  });
}

/**
 * Information about the app itself (version, runtimes, project links), shared between the main
 * process and the renderer (via preload) for the "À propos" settings section.
 * @module
 */

/** Versions of the app and of the runtimes it runs on, as read by the main process. */
export interface AppInfo {
  /** Display name of the app (`productName`). */
  name: string;
  /** Version of the app (`package.json`'s `version`). */
  version: string;
  /** Electron version. */
  electron: string;
  /** Chromium version. */
  chrome: string;
  /** Node.js version of the main process. */
  node: string;
  /** V8 version. */
  v8: string;
  /** Operating system, as Node's `process.platform` (`win32`, `darwin`, `linux`). */
  platform: string;
  /** CPU architecture, as Node's `process.arch` (`x64`, `arm64`…). */
  arch: string;
}

/**
 * The project's web pages the app can open in the default browser. `app:open-link` takes one of
 * these keys rather than a URL, so the renderer can't make the main process open anything else.
 */
export const APP_LINKS = {
  /** Source code repository. */
  repository: 'https://github.com/pprb/tankobon',
  /** Documentation site (GitHub Pages, built from `docs/`). */
  documentation: 'https://pprb.github.io/tankobon/',
  /** Releases, with the installers and the changelog of each version. */
  releases: 'https://github.com/pprb/tankobon/releases',
  /** Bug reports and feature requests. */
  issues: 'https://github.com/pprb/tankobon/issues',
} as const;

/** Key of one of the {@link APP_LINKS}. */
export type AppLink = keyof typeof APP_LINKS;

/** Whether `value` names one of the {@link APP_LINKS}; IPC arguments are checked, not trusted. */
export function isAppLink(value: unknown): value is AppLink {
  return typeof value === 'string' && Object.hasOwn(APP_LINKS, value);
}

/**
 * Plain-text summary of an {@link AppInfo}, one item per line, for the "copy" button of the
 * "À propos" section (to paste into a bug report).
 */
export function formatAppInfo(info: AppInfo): string {
  return [
    `${info.name} ${info.version}`,
    `Electron ${info.electron}`,
    `Chromium ${info.chrome}`,
    `Node.js ${info.node}`,
    `V8 ${info.v8}`,
    `${info.platform} ${info.arch}`,
  ].join('\n');
}

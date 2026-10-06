import { Menu, type MenuItemConstructorOptions } from 'electron';

import { t } from '../shared/i18n';

/**
 * The application menu, as a template. Electron's default menu (reload, zoom, Help links…) has
 * entries the app doesn't map, so only roles that do something here are kept: quit and close,
 * the editing commands (needed for text fields and the system shortcuts), fullscreen (the same
 * toggle as the reader's `F11`), minimize. The developer tools entry only exists in development mode.
 */
export function buildMenuTemplate(options: { isMac: boolean; isDevMode: boolean }): MenuItemConstructorOptions[] {
  const { isMac, isDevMode } = options;
  const view: MenuItemConstructorOptions[] = [{ role: 'togglefullscreen' }];
  if (isDevMode) {
    view.push({ type: 'separator' }, { role: 'toggleDevTools' });
  }
  return [
    ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
    { label: t('menu:file'), submenu: [isMac ? { role: 'close' } : { role: 'quit' }] },
    {
      label: t('menu:edit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    { label: t('menu:view'), submenu: view },
    { label: t('menu:window'), submenu: [{ role: 'minimize' }, { role: 'close' }] },
  ];
}

/** Installs the application menu in the current language; called again when the language changes. */
export function applyAppMenu(isDevMode: boolean): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate({ isMac: process.platform === 'darwin', isDevMode })));
}

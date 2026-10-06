import { describe, expect, it } from 'vitest';

import { buildMenuTemplate } from './app-menu';

const roles = (template: ReturnType<typeof buildMenuTemplate>) =>
  template.flatMap((item) => (Array.isArray(item.submenu) ? item.submenu : [item])).map((item) => item.role);

describe('buildMenuTemplate', () => {
  it('keeps only mapped entries, with no developer tools outside development mode', () => {
    const found = roles(buildMenuTemplate({ isMac: false, isDevMode: false }));
    expect(found).toContain('quit');
    expect(found).toContain('togglefullscreen');
    expect(found).not.toContain('toggleDevTools');
    expect(found).not.toContain('reload');
  });

  it('adds the developer tools in development mode', () => {
    expect(roles(buildMenuTemplate({ isMac: false, isDevMode: true }))).toContain('toggleDevTools');
  });

  it('starts with the app menu on macOS, which closes instead of quitting from File', () => {
    const template = buildMenuTemplate({ isMac: true, isDevMode: false });
    expect(template[0].role).toBe('appMenu');
    expect(roles(template)).not.toContain('quit');
  });
});

import { describe, expect, it } from 'vitest';

import { formatAppInfo, isAppLink, type AppInfo } from './app';

describe('isAppLink', () => {
  it('accepts the known link keys only', () => {
    expect(isAppLink('repository')).toBe(true);
    expect(isAppLink('documentation')).toBe(true);
    expect(isAppLink('https://example.com')).toBe(false);
    expect(isAppLink('toString')).toBe(false);
    expect(isAppLink(undefined)).toBe(false);
  });
});

describe('formatAppInfo', () => {
  it('lists the app and runtime versions, one per line', () => {
    const info: AppInfo = {
      name: 'Tankōbon',
      version: '0.2.1',
      electron: '38.0.0',
      chrome: '140.0.0.0',
      node: '22.18.0',
      v8: '14.0.0',
      platform: 'linux',
      arch: 'x64',
    };
    expect(formatAppInfo(info)).toBe(
      'Tankōbon 0.2.1\nElectron 38.0.0\nChromium 140.0.0.0\nNode.js 22.18.0\nV8 14.0.0\nlinux x64',
    );
  });
});

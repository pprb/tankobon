import { beforeAll, describe, expect, it } from 'vitest';

import { applyLanguage } from '../../shared/i18n';
import type { HttpOptions } from './http-json';
import { checkForUpdate } from './update-checker';

function options(respond: () => Response | Promise<Response>): HttpOptions {
  return { fetch: (async () => respond()) as typeof fetch, userAgent: 'test', timeoutMs: 1000 };
}

const release = (tag: string) => new Response(JSON.stringify({ tag_name: tag }), { status: 200 });

describe('checkForUpdate', () => {
  beforeAll(() => applyLanguage('fr'));

  it('reports a newer release', async () => {
    expect(await checkForUpdate('0.5.0', options(() => release('v0.6.0')))).toEqual({
      status: 'available',
      version: '0.6.0',
    });
  });

  it('is up to date on the same or an older release', async () => {
    expect(await checkForUpdate('0.5.0', options(() => release('v0.5.0')))).toEqual({ status: 'up-to-date' });
    expect(await checkForUpdate('0.5.0', options(() => release('v0.4.0')))).toEqual({ status: 'up-to-date' });
  });

  it('is up to date when the answer has no tag', async () => {
    expect(await checkForUpdate('0.5.0', options(() => new Response('{}', { status: 200 })))).toEqual({
      status: 'up-to-date',
    });
  });

  it('turns a failure into a translated error result', async () => {
    const result = await checkForUpdate('0.5.0', options(() => Promise.reject(new TypeError('offline'))));
    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.message).toContain('GitHub');
  });
});

import { describe, expect, it, vi } from 'vitest';

import { applyLanguage } from '../../shared/i18n';
import { isId, isIndex, tuple } from '../../shared/validation';
import { validated } from './validated';

const event = {} as never;

describe('validated', () => {
  applyLanguage('fr');

  it('calls the handler with the arguments once they are valid', () => {
    const fn = vi.fn((_e, id: string, index: number) => `${id}:${index}`);
    expect(validated('x:y', tuple(isId, isIndex), fn)(event, 'a', 2)).toBe('a:2');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('rejects invalid arguments without calling the handler', () => {
    const fn = vi.fn();
    const handler = validated('comic:read-page', tuple(isId, isIndex), fn);
    expect(() => handler(event, 'a', -1)).toThrow('comic:read-page');
    expect(() => handler(event, 'a')).toThrow();
    expect(() => handler(event, { path: '/etc/passwd' }, 1)).toThrow();
    expect(fn).not.toHaveBeenCalled();
  });
});

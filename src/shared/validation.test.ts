import { describe, expect, it } from 'vitest';

import {
  arrayOf,
  isId,
  isIndex,
  isMetadataQuery,
  isMetadataUpdate,
  isRating,
  isSettingKey,
  isSettingValue,
  isText,
  tuple,
} from './validation';

describe('scalar validators', () => {
  it('accepts non-empty strings as ids, and refuses anything else', () => {
    expect(isId('abc')).toBe(true);
    for (const bad of ['', 12, null, undefined, {}, ['a'], 'x'.repeat(1001)]) expect(isId(bad)).toBe(false);
  });

  it('allows an empty text but not a non-string', () => {
    expect(isText('')).toBe(true);
    expect(isText(1)).toBe(false);
  });

  it('accepts only non-negative safe integers as indexes', () => {
    expect(isIndex(0)).toBe(true);
    for (const bad of [-1, 1.5, NaN, Infinity, '1', null]) expect(isIndex(bad)).toBe(false);
  });

  it('bounds ratings to 0-5', () => {
    expect(isRating(5)).toBe(true);
    expect(isRating(6)).toBe(false);
  });

  it('checks every item of an array', () => {
    const strings = arrayOf(isText);
    expect(strings(['a', 'b'])).toBe(true);
    expect(strings(['a', 2])).toBe(false);
    expect(strings('ab')).toBe(false);
  });
});

describe('isMetadataUpdate', () => {
  it('accepts partial updates, nulls and credits', () => {
    expect(isMetadataUpdate({})).toBe(true);
    expect(
      isMetadataUpdate({
        title: 'T',
        series: null,
        volume: '12.1',
        credits: [{ firstName: '', lastName: 'Hergé', role: 'writer' }],
      }),
    ).toBe(true);
  });

  it('refuses wrong types, unknown roles and non-objects', () => {
    expect(isMetadataUpdate({ title: null })).toBe(false);
    expect(isMetadataUpdate({ series: 3 })).toBe(false);
    expect(
      isMetadataUpdate({
        credits: [{ firstName: '', lastName: 'x', role: 'boss' }],
      }),
    ).toBe(false);
    expect(isMetadataUpdate({ credits: [{ lastName: 'x', role: 'writer' }] })).toBe(false);
    for (const bad of [null, 'x', [], 3]) expect(isMetadataUpdate(bad)).toBe(false);
  });
});

describe('isMetadataQuery', () => {
  it('needs a text and a volume string or null', () => {
    expect(isMetadataQuery({ text: 'Tintin', volume: null })).toBe(true);
    expect(isMetadataQuery({ text: 'Tintin' })).toBe(false);
    expect(isMetadataQuery({ text: 1, volume: null })).toBe(false);
  });
});

describe('settings', () => {
  it('knows the setting keys, and nothing inherited', () => {
    expect(isSettingKey('readingMode')).toBe(true);
    for (const bad of ['nope', 'toString', '__proto__', 3]) expect(isSettingKey(bad)).toBe(false);
  });

  it('checks the type and the allowed values of a setting', () => {
    expect(isSettingValue('readingDirection', 'rtl')).toBe(true);
    expect(isSettingValue('readingDirection', 'up')).toBe(false);
    expect(isSettingValue('language', 'fr')).toBe(true);
    expect(isSettingValue('language', 'system')).toBe(true);
    expect(isSettingValue('language', 'klingon')).toBe(false);
    expect(isSettingValue('readerBackground', '#aBc123')).toBe(true);
    expect(isSettingValue('readerBackground', 'red; background:url(x)')).toBe(false);
    expect(isSettingValue('pageSpacing', 16)).toBe(true);
    expect(isSettingValue('pageSpacing', -1)).toBe(false);
    expect(isSettingValue('pageSpacing', NaN)).toBe(false);
    expect(isSettingValue('sidebarCollapsed', 'yes')).toBe(false);
    expect(isSettingValue('comicVineApiKey', 'abc')).toBe(true);
  });
});

describe('tuple', () => {
  it('requires exactly one valid argument per guard', () => {
    const guard = tuple(isId, isIndex);
    expect(guard(['a', 1])).toBe(true);
    expect(guard(['a'])).toBe(false);
    expect(guard(['a', 1, 2])).toBe(false);
    expect(guard([1, 1])).toBe(false);
  });

  it('accepts only an empty list without guards', () => {
    expect(tuple()([])).toBe(true);
    expect(tuple()(['x'])).toBe(false);
  });
});

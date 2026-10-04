import { describe, expect, it } from 'vitest';

import { directionalControls, disabledControls } from './reader-navigation';

describe('directionalControls', () => {
  it('advances forward and retreats backward in left-to-right order', () => {
    expect(directionalControls('ltr', 'next', 'prev')).toEqual({ advance: 'next', retreat: 'prev' });
  });

  it('swaps them in right-to-left order', () => {
    expect(directionalControls('rtl', 'next', 'prev')).toEqual({ advance: 'prev', retreat: 'next' });
  });
});

describe('disabledControls', () => {
  it('disables the left zone on the first page and the right zone on the last in LTR', () => {
    expect(disabledControls('ltr', 0, 10)).toEqual({ isPrevDisabled: true, isNextDisabled: false });
    expect(disabledControls('ltr', 9, 10)).toEqual({ isPrevDisabled: false, isNextDisabled: true });
    expect(disabledControls('ltr', 4, 10)).toEqual({ isPrevDisabled: false, isNextDisabled: false });
  });

  it('swaps the sides in RTL', () => {
    expect(disabledControls('rtl', 0, 10)).toEqual({ isPrevDisabled: false, isNextDisabled: true });
    expect(disabledControls('rtl', 9, 10)).toEqual({ isPrevDisabled: true, isNextDisabled: false });
  });

  it('disables both on a single-page book', () => {
    expect(disabledControls('ltr', 0, 1)).toEqual({ isPrevDisabled: true, isNextDisabled: true });
  });
});

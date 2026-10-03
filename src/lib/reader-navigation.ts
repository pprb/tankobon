/**
 * Page-turning rules of the single-page reader, kept pure so the left-to-right / right-to-left
 * swap can be tested.
 * @module
 */
import type { AppSettings } from '@/shared/settings';

/** The reader's physical controls (arrow keys, click zones, wheel), resolved to page steps. */
export interface DirectionalControls<T> {
  /** Moves toward the end of the reading order: the right control in LTR, the left one in RTL. */
  advance: T;
  /** Moves back toward the start: the opposite of `advance`. */
  retreat: T;
}

/**
 * Binds `advance` and `retreat` to the actions that move one page `forward` (index + 1) or
 * `backward` (index - 1), swapping them in right-to-left (manga) reading order.
 */
export function directionalControls<T>(
  direction: AppSettings['readingDirection'],
  forward: T,
  backward: T,
): DirectionalControls<T> {
  return direction === 'rtl' ? { advance: backward, retreat: forward } : { advance: forward, retreat: backward };
}

/**
 * Whether the physical left (`isPrevDisabled`) and right (`isNextDisabled`) click zones have
 * nowhere to go: the first and last page swap sides in right-to-left order.
 */
export function disabledControls(
  direction: AppSettings['readingDirection'],
  page: number,
  pageCount: number,
): { isPrevDisabled: boolean; isNextDisabled: boolean } {
  const isFirst = page === 0;
  const isLast = page === pageCount - 1;
  return direction === 'rtl'
    ? { isPrevDisabled: isLast, isNextDisabled: isFirst }
    : { isPrevDisabled: isFirst, isNextDisabled: isLast };
}

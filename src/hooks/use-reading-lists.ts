/**
 * The reading lists as React state, shared by every view and kept current by the main process.
 * @module
 */
import { useSyncExternalStore } from 'react';

import { appData } from '@/lib/app-data';
import type { ReadingList } from '@/shared/reading-list';

const subscribe = (listener: () => void) => appData.subscribe('readingLists', listener);

/** The reading lists, in the user's order; `null` until the first load. */
export function useReadingLists(): ReadingList[] | null {
  return useSyncExternalStore(subscribe, appData.getReadingLists);
}

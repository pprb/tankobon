/**
 * The library as React state, shared by every view and kept current by the main process.
 * @module
 */
import { useSyncExternalStore } from 'react';

import { appData } from '@/lib/app-data';
import type { LibraryEntry } from '@/shared/library';

const subscribe = (listener: () => void) => appData.subscribe('library', listener);

/**
 * Every library entry, most recently opened first; `null` until the first load. All views share
 * the same array (replaced, never mutated), so it can be a dependency of `useMemo`.
 */
export function useLibrary(): LibraryEntry[] | null {
  return useSyncExternalStore(subscribe, appData.getLibrary);
}

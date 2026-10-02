/**
 * The reading lists as React state, kept in sync across the views that show them.
 * @module
 */
import { useEffect, useState } from 'react';

import type { ReadingList } from '@/shared/reading-list';

const changes = new EventTarget();
const CHANGED = 'changed';

/**
 * Tells every mounted {@link useReadingLists} to reload. Call it after creating, renaming or
 * deleting a list (or importing data), so the sidebar doesn't keep showing stale names.
 */
export function notifyReadingListsChanged() {
  changes.dispatchEvent(new Event(CHANGED));
}

/**
 * Loads the reading lists (oldest first), and reloads them on {@link notifyReadingListsChanged}.
 * `null` until the first load.
 */
export function useReadingLists(): ReadingList[] | null {
  const [lists, setLists] = useState<ReadingList[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void window.tankobon.readingLists.list().then((loaded) => {
        if (!cancelled) setLists(loaded);
      });
    };
    load();
    changes.addEventListener(CHANGED, load);
    return () => {
      cancelled = true;
      changes.removeEventListener(CHANGED, load);
    };
  }, []);

  return lists;
}

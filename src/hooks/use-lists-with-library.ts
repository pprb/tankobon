/**
 * The reading lists and the library loaded together, for views that combine them.
 * @module
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { LibraryEntry } from '@/shared/library';
import type { ReadingList } from '@/shared/reading-list';

/** Options of {@link useListsWithLibrary}. */
export interface ListsWithLibraryOptions {
  /** When false, nothing is loaded (and `lists`/`library` stay null). Default true. */
  enabled?: boolean;
  /** Changing it discards the current data and loads again, e.g. the book whose progress matters. */
  reloadKey?: unknown;
}

/** What {@link useListsWithLibrary} returns. */
export interface ListsWithLibrary {
  /** The reading lists in the user's order; null until the first load for the current `reloadKey`. */
  lists: ReadingList[] | null;
  /** The whole library; null until the first load for the current `reloadKey`. */
  library: LibraryEntry[] | null;
  /** Loads both again; a reload still in flight is dropped in its favour. */
  reload: () => void;
  /** Replaces the loaded lists, to show a change already confirmed by main without a reload. */
  setLists: Dispatch<SetStateAction<ReadingList[] | null>>;
}

interface Loaded {
  reloadKey: unknown;
  lists: ReadingList[];
  library: LibraryEntry[];
}

/**
 * Loads `readingLists.list()` and `library.list()` together on mount and whenever `reloadKey`
 * changes. A response is dropped when the view unmounted, the key changed or a newer
 * {@link ListsWithLibrary.reload} started in the meantime, and data loaded for a previous key
 * is never returned for the new one.
 */
export function useListsWithLibrary({ enabled = true, reloadKey }: ListsWithLibraryOptions = {}): ListsWithLibrary {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const latest = useRef(0);

  const reload = useCallback(() => {
    const request = ++latest.current;
    void Promise.all([window.tankobon.readingLists.list(), window.tankobon.library.list()]).then(
      ([lists, library]) => {
        if (request === latest.current) setLoaded({ reloadKey, lists, library });
      },
    );
  }, [reloadKey]);

  useEffect(() => {
    if (!enabled) return;
    reload();
    const counter = latest;
    return () => {
      counter.current++;
    };
  }, [enabled, reload]);

  const current = enabled && loaded && Object.is(loaded.reloadKey, reloadKey) ? loaded : null;

  const setLists: ListsWithLibrary['setLists'] = useCallback(
    (update) =>
      setLoaded((previous) => {
        if (!previous) return previous;
        const lists = typeof update === 'function' ? update(previous.lists) : update;
        return lists ? { ...previous, lists } : previous;
      }),
    [],
  );

  return { lists: current?.lists ?? null, library: current?.library ?? null, reload, setLists };
}

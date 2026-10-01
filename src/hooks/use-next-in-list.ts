/**
 * The next book of a reading list, for the reader's "next" button.
 * @module
 */
import { useEffect, useState } from 'react';

import { listEntries, nextToRead } from '@/lib/reading-list';
import type { LibraryEntry } from '@/shared/library';

/** The list the reader was opened from, and the book to read after the current one. */
export interface NextInList {
  listId: string;
  listName: string;
  /** Null when every other book of the list is finished. */
  next: LibraryEntry | null;
}

/**
 * Looks up the book to read after `libraryId` in the reading list `listId` (the first unfinished
 * one other than the current book, see `nextToRead()`). Null while loading, when there is no
 * list, or when the list no longer exists or doesn't hold the current book. Fetched again
 * whenever the current book changes.
 */
export function useNextInList(listId: string | undefined, libraryId: string | undefined): NextInList | null {
  const [state, setState] = useState<{ key: string; value: NextInList | null } | null>(null);
  const key = `${listId}:${libraryId}`;

  useEffect(() => {
    if (!listId || !libraryId) return;
    let cancelled = false;
    void Promise.all([window.tankobon.readingLists.list(), window.tankobon.library.list()]).then(([lists, library]) => {
      if (cancelled) return;
      const list = lists.find((l) => l.id === listId);
      setState({
        key: `${listId}:${libraryId}`,
        // Opening an unrelated file from the reader keeps the `list` param: no suggestion then.
        value: list?.entryIds.includes(libraryId)
          ? { listId, listName: list.name, next: nextToRead(listEntries(list, library), libraryId) }
          : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [listId, libraryId]);

  // A result fetched for the previous book is never shown for the new one.
  return state?.key === key ? state.value : null;
}

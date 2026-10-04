/**
 * The next book of a reading list, for the reader's "next" button.
 * @module
 */
import { useMemo } from 'react';

import { useListsWithLibrary } from '@/hooks/use-lists-with-library';
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
  // Keyed by the current book: data loaded for the previous one is never used for the new one.
  const { lists, library } = useListsWithLibrary({
    enabled: !!listId && !!libraryId,
    reloadKey: `${listId}:${libraryId}`,
  });

  return useMemo(() => {
    if (!listId || !libraryId || !lists || !library) return null;
    const list = lists.find((l) => l.id === listId);
    // Opening an unrelated file from the reader keeps the `list` param: no suggestion then.
    return list?.entryIds.includes(libraryId)
      ? { listId, listName: list.name, next: nextToRead(listEntries(list, library), libraryId) }
      : null;
  }, [listId, libraryId, lists, library]);
}

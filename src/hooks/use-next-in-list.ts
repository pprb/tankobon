/**
 * The next book of a reading list, for the reader's "next" button.
 * @module
 */
import { useMemo } from 'react';

import { useLibrary } from '@/hooks/use-library';
import { useReadingLists } from '@/hooks/use-reading-lists';
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
 * list, or when the list no longer exists or doesn't hold the current book. Recomputed when the
 * library or the lists change, e.g. when the current book's progress is saved.
 */
export function useNextInList(listId: string | undefined, libraryId: string | undefined): NextInList | null {
  const lists = useReadingLists();
  const library = useLibrary();

  return useMemo(() => {
    if (!listId || !libraryId || !lists || !library) return null;
    const list = lists.find((l) => l.id === listId);
    // Opening an unrelated file from the reader keeps the `list` param: no suggestion then.
    return list?.entryIds.includes(libraryId)
      ? { listId, listName: list.name, next: nextToRead(listEntries(list, library), libraryId) }
      : null;
  }, [listId, libraryId, lists, library]);
}

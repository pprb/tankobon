/**
 * Pure reading-list logic for the renderer: which books count as finished, the list's progress,
 * the next book to read, the reordering rules (finished books stay where they are; the lists
 * themselves move freely), and the drag and drop of a library book onto a list.
 * @module
 */
import type { LibraryEntry } from '@/shared/library';
import type { ReadingList, ReadingListResult } from '@/shared/reading-list';

/** The tag that marks a book as read, also one of the library page's quick tags. */
export const READ_TAG = 'Lu';

/** Whether a book counts as finished: its last page was reached, or it carries the `Lu` tag. */
export function isFinished(entry: LibraryEntry): boolean {
  return entry.tags.includes(READ_TAG) || (entry.pageCount > 0 && entry.currentPage >= entry.pageCount - 1);
}

/** The list's books, in reading order; ids no longer in the library are skipped. */
export function listEntries(list: ReadingList, library: LibraryEntry[]): LibraryEntry[] {
  const byId = new Map(library.map((entry) => [entry.id, entry]));
  return list.entryIds.flatMap((id) => byId.get(id) ?? []);
}

/** How far along a list is: finished books out of all its books, and that as a 0–100 percentage. */
export interface ListProgress {
  finished: number;
  total: number;
  /** 0 for an empty list. */
  percent: number;
}

/** Progress of a list given its books (see `listEntries()`). */
export function listProgress(entries: LibraryEntry[]): ListProgress {
  const finished = entries.filter(isFinished).length;
  const total = entries.length;
  return { finished, total, percent: total === 0 ? 0 : (finished / total) * 100 };
}

/**
 * The book to read next: the first unfinished one, in list order. `excludeId` skips a book, the
 * one just finished in the reader, whose progress may not be saved yet. Null when all are read.
 */
export function nextToRead(entries: LibraryEntry[], excludeId?: string): LibraryEntry | null {
  return entries.find((entry) => entry.id !== excludeId && !isFinished(entry)) ?? null;
}

/**
 * Moves the book at index `from` to index `to` in `order`, a list's entry ids. Finished books
 * are pinned: they can't be moved, and the others move around them (only the unfinished books
 * swap places; each finished book keeps its index). Returns null when the move is refused, i.e.
 * when `from` or `to` is a finished book, out of range, or the same index.
 */
export function moveUnfinished(order: string[], finished: ReadonlySet<string>, from: number, to: number): string[] | null {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return null;
  if (finished.has(order[from]) || finished.has(order[to])) return null;

  const slots = order.flatMap((id, index) => (finished.has(id) ? [] : [index]));
  const unfinished = slots.map((index) => order[index]);
  const [moved] = unfinished.splice(slots.indexOf(from), 1);
  unfinished.splice(slots.indexOf(to), 0, moved);

  const result = [...order];
  slots.forEach((index, rank) => {
    result[index] = unfinished[rank];
  });
  return result;
}

/**
 * Moves the item at index `from` to index `to`, shifting the ones in between (how the sidebar
 * reorders the lists themselves, by drag and drop). Returns null when the move is a no-op or out
 * of range.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] | null {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return null;
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

/**
 * The drag-and-drop data type of a library book dragged from the library page onto a reading
 * list of the sidebar. A custom type, so the sidebar tells a book from one of its own lists being
 * reordered, and from files dragged in from outside the app.
 */
export const LIBRARY_ENTRY_DRAG_TYPE = 'application/x-tankobon-entry';

/** What a dragged library book carries: its id, and its title for the confirmation message. */
export interface DraggedEntry {
  id: string;
  title: string;
}

/** Encodes a dragged book for `DataTransfer.setData()` under {@link LIBRARY_ENTRY_DRAG_TYPE}. */
export function encodeDraggedEntry(entry: DraggedEntry): string {
  return JSON.stringify({ id: entry.id, title: entry.title });
}

/**
 * Decodes what {@link encodeDraggedEntry} wrote; null for anything else (the data comes from a
 * drag, which another app could have started with the same type).
 */
export function decodeDraggedEntry(data: string): DraggedEntry | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { id, title } = parsed as Record<string, unknown>;
    return typeof id === 'string' && id !== '' && typeof title === 'string' ? { id, title } : null;
  } catch {
    return null;
  }
}

/** The French message shown after a book was dropped on a list, and whether it is an error. */
export interface DropFeedback {
  message: string;
  error: boolean;
}

/**
 * The message for a book dropped on `list` (as it was before the drop), given what
 * `readingLists.addEntry()` answered: added, already there (the repository accepts it as a no-op),
 * or refused with its own message (full list, book gone).
 */
export function dropFeedback(list: ReadingList, entry: DraggedEntry, result: ReadingListResult): DropFeedback {
  if (result.status === 'error') return { message: result.message, error: true };
  if (list.entryIds.includes(entry.id)) {
    return { message: `« ${entry.title} » est déjà dans « ${list.name} ».`, error: false };
  }
  return { message: `« ${entry.title} » ajouté à « ${list.name} ».`, error: false };
}

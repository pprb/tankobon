/**
 * Reading-list types shared between the main process and the renderer (via preload).
 * @module
 */

/** Most books a reading list can hold. */
export const MAX_READING_LIST_SIZE = 50;

/**
 * An ordered pile of library entries to read, first to last. The entries themselves (title,
 * progress, tags) come from the library: a list only holds their ids, in reading order.
 */
export interface ReadingList {
  id: string;
  name: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Ids of the library entries in the list, in reading order. */
  entryIds: string[];
}

/**
 * Outcome of a reading-list change that can be refused (adding a book to a full list, renaming
 * to an empty name…). Same rationale as `ImportResult`: the refusal is a French message to show,
 * not a thrown error.
 */
export type ReadingListResult = { status: 'ok'; list: ReadingList } | { status: 'error'; message: string };

/**
 * Outcome of reordering the reading lists themselves: every list in its new order, or a French
 * message when the order is stale (a list was created or deleted in the meantime).
 */
export type ReadingListOrderResult = { status: 'ok'; lists: ReadingList[] } | { status: 'error'; message: string };

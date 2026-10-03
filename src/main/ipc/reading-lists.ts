import { arrayOf, isId, isText, tuple } from '../../shared/validation';
import type { ReadingListRepository } from '../db/reading-list-repository';
import { handle } from './handle';

// Channel names are shared with preload.ts: keep them in sync.
export const READING_LIST_CHANNELS = {
  list: 'reading-lists:list',
  create: 'reading-lists:create',
  rename: 'reading-lists:rename',
  remove: 'reading-lists:remove',
  addEntry: 'reading-lists:add-entry',
  removeEntry: 'reading-lists:remove-entry',
  reorder: 'reading-lists:reorder',
  reorderLists: 'reading-lists:reorder-lists',
} as const;

export function registerReadingListIpc(repo: ReadingListRepository): void {
  handle(READING_LIST_CHANNELS.list, tuple(), () => repo.list());

  handle(READING_LIST_CHANNELS.create, tuple(isText), (_event, name) => repo.create(name));

  handle(READING_LIST_CHANNELS.rename, tuple(isId, isText), (_event, id, name) => repo.rename(id, name));

  handle(READING_LIST_CHANNELS.remove, tuple(isId), (_event, id) => repo.remove(id));

  handle(READING_LIST_CHANNELS.addEntry, tuple(isId, isId), (_event, id, libraryId) => repo.addEntry(id, libraryId));

  handle(READING_LIST_CHANNELS.removeEntry, tuple(isId, isId), (_event, id, libraryId) =>
    repo.removeEntry(id, libraryId),
  );

  handle(READING_LIST_CHANNELS.reorder, tuple(isId, arrayOf(isId)), (_event, id, entryIds) =>
    repo.reorder(id, entryIds),
  );

  handle(READING_LIST_CHANNELS.reorderLists, tuple(arrayOf(isId)), (_event, listIds) => repo.reorderLists(listIds));
}

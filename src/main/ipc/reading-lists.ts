import { ipcMain } from 'electron';

import type { ReadingListRepository } from '../db/reading-list-repository';
import { expectNonEmptyString, expectString, expectStringArray } from './validate';

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
  ipcMain.handle(READING_LIST_CHANNELS.list, () => repo.list());

  ipcMain.handle(READING_LIST_CHANNELS.create, (_event, name: unknown) => repo.create(expectString(name, 'name')));

  ipcMain.handle(READING_LIST_CHANNELS.rename, (_event, id: unknown, name: unknown) =>
    repo.rename(expectNonEmptyString(id, 'id'), expectString(name, 'name')),
  );

  ipcMain.handle(READING_LIST_CHANNELS.remove, (_event, id: unknown) => repo.remove(expectNonEmptyString(id, 'id')));

  ipcMain.handle(READING_LIST_CHANNELS.addEntry, (_event, id: unknown, libraryId: unknown) =>
    repo.addEntry(expectNonEmptyString(id, 'id'), expectNonEmptyString(libraryId, 'libraryId')),
  );

  ipcMain.handle(READING_LIST_CHANNELS.removeEntry, (_event, id: unknown, libraryId: unknown) =>
    repo.removeEntry(expectNonEmptyString(id, 'id'), expectNonEmptyString(libraryId, 'libraryId')),
  );

  ipcMain.handle(READING_LIST_CHANNELS.reorder, (_event, id: unknown, entryIds: unknown) =>
    repo.reorder(expectNonEmptyString(id, 'id'), expectStringArray(entryIds, 'entryIds')),
  );

  ipcMain.handle(READING_LIST_CHANNELS.reorderLists, (_event, listIds: unknown) =>
    repo.reorderLists(expectStringArray(listIds, 'listIds')),
  );
}

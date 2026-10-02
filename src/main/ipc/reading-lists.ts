import { ipcMain } from 'electron';

import type { ReadingListRepository } from '../db/reading-list-repository';

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

  ipcMain.handle(READING_LIST_CHANNELS.create, (_event, name: string) => repo.create(name));

  ipcMain.handle(READING_LIST_CHANNELS.rename, (_event, id: string, name: string) => repo.rename(id, name));

  ipcMain.handle(READING_LIST_CHANNELS.remove, (_event, id: string) => repo.remove(id));

  ipcMain.handle(READING_LIST_CHANNELS.addEntry, (_event, id: string, libraryId: string) =>
    repo.addEntry(id, libraryId),
  );

  ipcMain.handle(READING_LIST_CHANNELS.removeEntry, (_event, id: string, libraryId: string) =>
    repo.removeEntry(id, libraryId),
  );

  ipcMain.handle(READING_LIST_CHANNELS.reorder, (_event, id: string, entryIds: string[]) =>
    repo.reorder(id, entryIds),
  );

  ipcMain.handle(READING_LIST_CHANNELS.reorderLists, (_event, listIds: string[]) => repo.reorderLists(listIds));
}

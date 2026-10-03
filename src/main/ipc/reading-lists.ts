import { ipcMain } from 'electron';

import type { NotifyDataChange } from './data-changes';
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

export function registerReadingListIpc(repo: ReadingListRepository, notify: NotifyDataChange): void {
  /** Runs a write, then announces it (a refused one changed nothing, but reloading is harmless). */
  const write = <A extends unknown[], R>(fn: (...args: A) => R) => {
    return (_event: unknown, ...args: A): R => {
      const result = fn(...args);
      notify({ scope: 'readingLists' });
      return result;
    };
  };

  ipcMain.handle(READING_LIST_CHANNELS.list, () => repo.list());

  ipcMain.handle(READING_LIST_CHANNELS.create, write((name: string) => repo.create(name)));

  ipcMain.handle(READING_LIST_CHANNELS.rename, write((id: string, name: string) => repo.rename(id, name)));

  ipcMain.handle(READING_LIST_CHANNELS.remove, write((id: string) => repo.remove(id)));

  ipcMain.handle(
    READING_LIST_CHANNELS.addEntry,
    write((id: string, libraryId: string) => repo.addEntry(id, libraryId)),
  );

  ipcMain.handle(
    READING_LIST_CHANNELS.removeEntry,
    write((id: string, libraryId: string) => repo.removeEntry(id, libraryId)),
  );

  ipcMain.handle(
    READING_LIST_CHANNELS.reorder,
    write((id: string, entryIds: string[]) => repo.reorder(id, entryIds)),
  );

  ipcMain.handle(READING_LIST_CHANNELS.reorderLists, write((listIds: string[]) => repo.reorderLists(listIds)));
}

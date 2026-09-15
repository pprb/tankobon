import { ipcMain } from 'electron';

import type { LibraryRepository } from '../db/library-repository';

// Channel names are shared with preload.ts: keep them in sync.
export const LIBRARY_CHANNELS = {
  list: 'library:list',
  remove: 'library:remove',
  updateProgress: 'library:update-progress',
  updateRating: 'library:update-rating',
  updateTags: 'library:update-tags',
} as const;

export function registerLibraryIpc(repo: LibraryRepository): void {
  ipcMain.handle(LIBRARY_CHANNELS.list, () => repo.list());

  ipcMain.handle(LIBRARY_CHANNELS.remove, (_event, id: string) => repo.remove(id));

  ipcMain.handle(LIBRARY_CHANNELS.updateProgress, (_event, id: string, currentPage: number) =>
    repo.updateProgress(id, currentPage),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateRating, (_event, id: string, rating: number) =>
    repo.updateRating(id, rating),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateTags, (_event, id: string, tags: string[]) => repo.updateTags(id, tags));
}

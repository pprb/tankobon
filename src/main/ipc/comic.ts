import { app, ipcMain } from 'electron';
import { stat } from 'node:fs/promises';
import { dirname } from 'node:path';

import { SUPPORTED_COMIC_EXTENSIONS } from '../../shared/comic';
import { t } from '../../shared/i18n';
import type { LibraryRepository } from '../db/library-repository';
import { ComicService } from '../services/comic-service';
import type { ThumbnailCache } from '../services/thumbnail-cache';
import { openDialogFor } from './dialogs';

// Channel names are shared with preload.ts: keep them in sync.
export const COMIC_CHANNELS = {
  pickFile: 'comic:pick-file',
  open: 'comic:open',
  readPage: 'comic:read-page',
  close: 'comic:close',
} as const;

/**
 * Directory of the last comic opened, so the file dialog picks up where the user left off.
 * Returns undefined (i.e. the OS default location) when there's no history yet or when that
 * directory is gone — an external drive unplugged, a folder moved — since Electron's behaviour
 * with a stale `defaultPath` is platform-dependent.
 */
async function lastOpenedDirectory(libraryRepo: LibraryRepository): Promise<string | undefined> {
  const lastPath = libraryRepo.lastOpenedPath();
  if (!lastPath) {
    return undefined;
  }
  const directory = dirname(lastPath);
  try {
    return (await stat(directory)).isDirectory() ? directory : undefined;
  } catch {
    return undefined;
  }
}

export function registerComicIpc(libraryRepo: LibraryRepository, thumbnails: ThumbnailCache): void {
  const service = new ComicService();

  ipcMain.handle(COMIC_CHANNELS.pickFile, async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:openComic'),
      properties: ['openFile'],
      filters: [{ name: t('dialogs:comicFiles'), extensions: [...SUPPORTED_COMIC_EXTENSIONS] }],
      defaultPath: await lastOpenedDirectory(libraryRepo),
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle(COMIC_CHANNELS.open, async (_event, filePath: string) => {
    const comic = await service.open(filePath);
    const { size } = await stat(comic.path);
    const entry = libraryRepo.touch(comic.path, comic.title, comic.pageCount, comic.fileCount, size);
    // In the background, from the archive just opened: opening the book must not wait for its cover.
    if (comic.pageCount > 0) {
      void thumbnails.ensure(comic.path, () => service.readPage(comic.id, 0));
    }
    // The library title wins over the file name: the user may have set one from a metadata lookup.
    return { ...comic, title: entry.title, libraryId: entry.id, resumePage: entry.currentPage };
  });

  ipcMain.handle(COMIC_CHANNELS.readPage, (_event, id: string, index: number) =>
    service.readPage(id, index),
  );

  ipcMain.handle(COMIC_CHANNELS.close, (_event, id: string) => service.close(id));

  app.on('will-quit', () => {
    void service.closeAll();
  });
}

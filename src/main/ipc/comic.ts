import { BrowserWindow, app, dialog, ipcMain } from 'electron';
import { stat } from 'node:fs/promises';
import { dirname } from 'node:path';

import { SUPPORTED_COMIC_EXTENSIONS, type OpenComicResult } from '../../shared/comic';
import { t } from '../../shared/i18n';
import type { LibraryRepository } from '../db/library-repository';
import { ComicService } from '../services/comic-service';
import { openErrorMessage } from '../services/open-error';
import type { ThumbnailCache } from '../services/thumbnail-cache';
import { MAX_PATH_LENGTH, IpcArgumentError, expectInteger, expectNonEmptyString } from './validate';

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

/** Upper bound of a page index (see `library.ts`). */
const MAX_PAGE_INDEX = 1_000_000;

export function registerComicIpc(libraryRepo: LibraryRepository, thumbnails: ThumbnailCache): void {
  const service = new ComicService();
  // The file the user last chose in the open dialog: with the library's books, the only paths
  // `comic:open` accepts, so a renderer can't have the main process read an arbitrary file.
  let lastPickedPath: string | null = null;

  ipcMain.handle(COMIC_CHANNELS.pickFile, async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:openComic'),
      properties: ['openFile'],
      filters: [{ name: t('dialogs:comicFiles'), extensions: [...SUPPORTED_COMIC_EXTENSIONS] }],
      defaultPath: await lastOpenedDirectory(libraryRepo),
    };
    const window = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    lastPickedPath = canceled ? null : filePaths[0];
    return lastPickedPath;
  });

  ipcMain.handle(COMIC_CHANNELS.open, async (_event, rawPath: unknown): Promise<OpenComicResult> => {
    const filePath = expectNonEmptyString(rawPath, 'filePath', MAX_PATH_LENGTH);
    if (filePath !== lastPickedPath && !libraryRepo.hasPath(filePath)) {
      throw new IpcArgumentError('filePath', 'a path from the library or the last file picked');
    }
    try {
      const comic = await service.open(filePath);
      const { size } = await stat(comic.path);
      const entry = libraryRepo.touch(comic.path, comic.title, comic.pageCount, comic.fileCount, size);
      // In the background, from the archive just opened: opening the book must not wait for its cover.
      if (comic.pageCount > 0) {
        void thumbnails.ensure(comic.path, () => service.readPage(comic.id, 0));
      }
      // The library title wins over the file name: the user may have set one from a metadata lookup.
      return {
        status: 'ok',
        comic: { ...comic, title: entry.title, libraryId: entry.id, resumePage: entry.currentPage },
      };
    } catch (error) {
      return { status: 'error', message: openErrorMessage(error) };
    }
  });

  ipcMain.handle(COMIC_CHANNELS.readPage, (_event, id: unknown, index: unknown) =>
    service.readPage(expectNonEmptyString(id, 'id'), expectInteger(index, 'index', 0, MAX_PAGE_INDEX)),
  );

  ipcMain.handle(COMIC_CHANNELS.close, (_event, id: unknown) => service.close(expectNonEmptyString(id, 'id')));

  app.on('will-quit', () => {
    void service.closeAll();
  });
}

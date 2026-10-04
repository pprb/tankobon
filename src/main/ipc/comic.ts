import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { dirname } from 'node:path';

import { SUPPORTED_COMIC_EXTENSIONS, type OpenComicResult } from '../../shared/comic';
import { t } from '../../shared/i18n';
import type { LibraryRepository } from '../db/library-repository';
import { ComicService } from '../services/comic-service';
import { openErrorMessage } from '../services/open-error';
import type { ThumbnailCache } from '../services/thumbnail-cache';
import type { NotifyDataChange } from './data-changes';
import { openDialogFor } from './dialogs';
import { handle } from './handle';
import { args, idArg, pageIndexArg } from './validate';

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

export function registerComicIpc(
  libraryRepo: LibraryRepository,
  thumbnails: ThumbnailCache,
  notify: NotifyDataChange,
): void {
  const service = new ComicService();
  // The files the user picked in the open dialog, by the opaque token `comic:pick-file` returned.
  // With the library's books (by id), they are the only things `comic:open` accepts: the renderer
  // never names a path, so it can't have the main process read an arbitrary file.
  const pickedPaths = new Map<string, string>();

  handle(COMIC_CHANNELS.pickFile, args(), async (event) => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:openComic'),
      properties: ['openFile'],
      filters: [{ name: t('dialogs:comicFiles'), extensions: [...SUPPORTED_COMIC_EXTENSIONS] }],
      defaultPath: await lastOpenedDirectory(libraryRepo),
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
    if (canceled || filePaths.length === 0) {
      return null;
    }
    const token = randomUUID();
    pickedPaths.set(token, filePaths[0]);
    return token;
  });

  handle(COMIC_CHANNELS.open, args(idArg), async (_event, ref): Promise<OpenComicResult> => {
    // A dialog token, else a library entry id; anything else is not a book we know.
    const filePath = pickedPaths.get(ref) ?? libraryRepo.get(ref)?.path;
    if (!filePath) {
      return { status: 'error', message: t('errors:archive.unknownBook') };
    }
    try {
      const comic = await service.open(filePath);
      const { size } = await stat(comic.path);
      const entry = libraryRepo.touch(comic.path, comic.title, comic.pageCount, comic.fileCount, size);
      // Opening bumps `lastOpenedAt` (and may refresh the title and page count).
      notify({ scope: 'library', upserted: [entry] });
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

  handle(COMIC_CHANNELS.readPage, args(idArg, pageIndexArg), (_event, id, index) => service.readPage(id, index));

  handle(COMIC_CHANNELS.close, args(idArg), (_event, id) => service.close(id));

  app.on('will-quit', () => {
    void service.closeAll();
  });
}

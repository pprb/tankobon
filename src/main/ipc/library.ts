import { BrowserWindow, dialog, ipcMain } from 'electron';

import { t } from '../../shared/i18n';
import type { ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';
import type { ThumbnailCache } from '../services/thumbnail-cache';
import {
  expectInteger,
  expectMetadataUpdate,
  expectNonEmptyString,
  expectStringArray,
} from './validate';

// Channel names are shared with preload.ts: keep them in sync.
export const LIBRARY_CHANNELS = {
  list: 'library:list',
  addFolder: 'library:add-folder',
  /** Main → renderer, while `addFolder` runs. */
  scanProgress: 'library:scan-progress',
  remove: 'library:remove',
  updateProgress: 'library:update-progress',
  updateRating: 'library:update-rating',
  updateTags: 'library:update-tags',
  updateMetadata: 'library:update-metadata',
  thumbnail: 'library:thumbnail',
} as const;

/** Upper bound of a page index: no archive has more pages, and it keeps absurd numbers out of the database. */
const MAX_PAGE_INDEX = 1_000_000;

export function registerLibraryIpc(repo: LibraryRepository, thumbnails: ThumbnailCache): void {
  ipcMain.handle(LIBRARY_CHANNELS.list, () => repo.list());

  ipcMain.handle(LIBRARY_CHANNELS.addFolder, async (event): Promise<ScanResult> => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:addFolder'),
      properties: ['openDirectory'],
    };
    const window = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const directory = filePaths[0];
    const summary = await scanIntoLibrary(
      repo,
      directory,
      (progress) => {
        // The renderer may be gone (window closed mid-scan); dropping the update is enough.
        if (!event.sender.isDestroyed()) {
          event.sender.send(LIBRARY_CHANNELS.scanProgress, progress);
        }
      },
      (archive) => thumbnails.storeFromArchive(archive),
    );
    return { status: 'ok', directory, ...summary };
  });

  ipcMain.handle(LIBRARY_CHANNELS.remove, async (_event, rawId: unknown) => {
    const id = expectNonEmptyString(rawId, 'id');
    const entry = repo.get(id);
    repo.remove(id);
    if (entry) {
      await thumbnails.remove(entry.path);
    }
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateProgress, (_event, id: unknown, currentPage: unknown) =>
    repo.updateProgress(
      expectNonEmptyString(id, 'id'),
      expectInteger(currentPage, 'currentPage', 0, MAX_PAGE_INDEX),
    ),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateRating, (_event, id: unknown, rating: unknown) =>
    repo.updateRating(expectNonEmptyString(id, 'id'), expectInteger(rating, 'rating', 0, 5)),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateTags, (_event, id: unknown, tags: unknown) =>
    repo.updateTags(expectNonEmptyString(id, 'id'), expectStringArray(tags, 'tags')),
  );

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  ipcMain.handle(LIBRARY_CHANNELS.thumbnail, (_event, id: unknown) => {
    const entry = repo.get(expectNonEmptyString(id, 'id'));
    return entry ? thumbnails.ensure(entry.path) : null;
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateMetadata, (_event, id: unknown, update: unknown) =>
    repo.updateMetadata(expectNonEmptyString(id, 'id'), expectMetadataUpdate(update)),
  );
}

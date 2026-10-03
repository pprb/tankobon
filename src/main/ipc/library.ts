import { BrowserWindow, dialog } from 'electron';

import { t } from '../../shared/i18n';
import type { ScanResult } from '../../shared/library';
import { arrayOf, isId, isIndex, isMetadataUpdate, isRating, isText, tuple } from '../../shared/validation';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';
import type { ThumbnailCache } from '../services/thumbnail-cache';
import { handle } from './handle';

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

export function registerLibraryIpc(repo: LibraryRepository, thumbnails: ThumbnailCache): void {
  handle(LIBRARY_CHANNELS.list, tuple(), () => repo.list());

  handle(LIBRARY_CHANNELS.addFolder, tuple(), async (event): Promise<ScanResult> => {
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

  handle(LIBRARY_CHANNELS.remove, tuple(isId), async (_event, id) => {
    const entry = repo.get(id);
    repo.remove(id);
    if (entry) {
      await thumbnails.remove(entry.path);
    }
  });

  handle(LIBRARY_CHANNELS.updateProgress, tuple(isId, isIndex), (_event, id, currentPage) =>
    repo.updateProgress(id, currentPage),
  );

  handle(LIBRARY_CHANNELS.updateRating, tuple(isId, isRating), (_event, id, rating) => repo.updateRating(id, rating));

  handle(LIBRARY_CHANNELS.updateTags, tuple(isId, arrayOf(isText)), (_event, id, tags) => repo.updateTags(id, tags));

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  handle(LIBRARY_CHANNELS.thumbnail, tuple(isId), (_event, id) => {
    const entry = repo.get(id);
    return entry ? thumbnails.ensure(entry.path) : null;
  });

  handle(LIBRARY_CHANNELS.updateMetadata, tuple(isId, isMetadataUpdate), (_event, id, update) =>
    repo.updateMetadata(id, update),
  );
}

import { ipcMain } from 'electron';

import { t } from '../../shared/i18n';
import type { MetadataUpdate, ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';
import { openDialogFor } from './dialogs';
import type { ThumbnailCache } from '../services/thumbnail-cache';

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
  ipcMain.handle(LIBRARY_CHANNELS.list, () => repo.list());

  ipcMain.handle(LIBRARY_CHANNELS.addFolder, async (event): Promise<ScanResult> => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:addFolder'),
      properties: ['openDirectory'],
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
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

  ipcMain.handle(LIBRARY_CHANNELS.remove, async (_event, id: string) => {
    const entry = repo.get(id);
    repo.remove(id);
    if (entry) {
      await thumbnails.remove(entry.path);
    }
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateProgress, (_event, id: string, currentPage: number) =>
    repo.updateProgress(id, currentPage),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateRating, (_event, id: string, rating: number) =>
    repo.updateRating(id, rating),
  );

  ipcMain.handle(LIBRARY_CHANNELS.updateTags, (_event, id: string, tags: string[]) => repo.updateTags(id, tags));

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  ipcMain.handle(LIBRARY_CHANNELS.thumbnail, (_event, id: string) => {
    const entry = repo.get(id);
    return entry ? thumbnails.ensure(entry.path) : null;
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateMetadata, (_event, id: string, update: MetadataUpdate) =>
    repo.updateMetadata(id, update),
  );
}

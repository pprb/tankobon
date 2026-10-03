import { BrowserWindow, dialog, ipcMain } from 'electron';

import { t } from '../../shared/i18n';
import type { NotifyDataChange } from './data-changes';
import type { MetadataUpdate, ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';
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

export function registerLibraryIpc(
  repo: LibraryRepository,
  thumbnails: ThumbnailCache,
  notify: NotifyDataChange,
): void {
  /** Announces the new state of entries a handler just wrote (the ones that still exist). */
  const notifyUpserted = (...ids: string[]) => {
    const upserted = ids.flatMap((id) => repo.get(id) ?? []);
    if (upserted.length > 0) notify({ scope: 'library', upserted });
  };

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
    notify({ scope: 'library' });
    return { status: 'ok', directory, ...summary };
  });

  ipcMain.handle(LIBRARY_CHANNELS.remove, async (_event, id: string) => {
    const entry = repo.get(id);
    repo.remove(id);
    notify({ scope: 'library', removed: [id] });
    // The book left the reading lists it was in.
    notify({ scope: 'readingLists' });
    if (entry) {
      await thumbnails.remove(entry.path);
    }
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateProgress, (_event, id: string, currentPage: number) => {
    repo.updateProgress(id, currentPage);
    notifyUpserted(id);
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateRating, (_event, id: string, rating: number) => {
    repo.updateRating(id, rating);
    notifyUpserted(id);
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateTags, (_event, id: string, tags: string[]) => {
    repo.updateTags(id, tags);
    notifyUpserted(id);
  });

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  ipcMain.handle(LIBRARY_CHANNELS.thumbnail, (_event, id: string) => {
    const entry = repo.get(id);
    return entry ? thumbnails.ensure(entry.path) : null;
  });

  ipcMain.handle(LIBRARY_CHANNELS.updateMetadata, (_event, id: string, update: MetadataUpdate) => {
    const updated = repo.updateMetadata(id, update);
    if (updated) notify({ scope: 'library', upserted: [updated] });
    return updated;
  });
}

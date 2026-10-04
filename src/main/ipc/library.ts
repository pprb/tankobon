import { t } from '../../shared/i18n';
import type { ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import type { DecoderClient } from '../decoder/decoder-client';
import { scanIntoLibrary } from '../services/library-scanner';
import { openDialogFor } from './dialogs';
import { handle } from './handle';
import { args, expectInteger, expectMetadataUpdate, expectStringArray, idArg, pageIndexArg } from './validate';

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

export function registerLibraryIpc(repo: LibraryRepository, decoder: DecoderClient): void {
  handle(LIBRARY_CHANNELS.list, args(), () => repo.list());

  handle(LIBRARY_CHANNELS.addFolder, args(), async (event): Promise<ScanResult> => {
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
      (filePath) => decoder.inspect(filePath),
    );
    return { status: 'ok', directory, ...summary };
  });

  handle(LIBRARY_CHANNELS.remove, args(idArg), async (_event, id) => {
    const entry = repo.get(id);
    repo.remove(id);
    if (entry) {
      await decoder.removeThumbnail(entry.path).catch(() => undefined);
    }
  });

  handle(LIBRARY_CHANNELS.updateProgress, args(idArg, pageIndexArg), (_event, id, currentPage) =>
    repo.updateProgress(id, currentPage),
  );

  handle(
    LIBRARY_CHANNELS.updateRating,
    args(idArg, (rating) => expectInteger(rating, 'rating', 0, 5)),
    (_event, id, rating) => repo.updateRating(id, rating),
  );

  handle(
    LIBRARY_CHANNELS.updateTags,
    args(idArg, (tags) => expectStringArray(tags, 'tags')),
    (_event, id, tags) => repo.updateTags(id, tags),
  );

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  handle(LIBRARY_CHANNELS.thumbnail, args(idArg), (_event, id) => {
    const entry = repo.get(id);
    return entry ? decoder.thumbnail(entry.path).catch(() => null) : null;
  });

  handle(LIBRARY_CHANNELS.updateMetadata, args(idArg, expectMetadataUpdate), (_event, id, update) =>
    repo.updateMetadata(id, update),
  );
}

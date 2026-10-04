import { t } from '../../shared/i18n';
import type { ScanResult } from '../../shared/library';
import type { LibraryRepository } from '../db/library-repository';
import { scanIntoLibrary } from '../services/library-scanner';
import type { NotifyDataChange } from './data-changes';
import { openDialogFor } from './dialogs';
import type { ThumbnailCache } from '../services/thumbnail-cache';
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
      (archive) => thumbnails.storeFromArchive(archive),
    );
    notify({ scope: 'library' });
    return { status: 'ok', directory, ...summary };
  });

  handle(LIBRARY_CHANNELS.remove, args(idArg), async (_event, id) => {
    const entry = repo.get(id);
    repo.remove(id);
    notify({ scope: 'library', removed: [id] });
    // The book left the reading lists it was in.
    notify({ scope: 'readingLists' });
    if (entry) {
      await thumbnails.remove(entry.path);
    }
  });

  handle(LIBRARY_CHANNELS.updateProgress, args(idArg, pageIndexArg), (_event, id, currentPage) => {
    repo.updateProgress(id, currentPage);
    notifyUpserted(id);
  });

  handle(
    LIBRARY_CHANNELS.updateRating,
    args(idArg, (rating) => expectInteger(rating, 'rating', 0, 5)),
    (_event, id, rating) => {
      repo.updateRating(id, rating);
      notifyUpserted(id);
    },
  );

  handle(
    LIBRARY_CHANNELS.updateTags,
    args(idArg, (tags) => expectStringArray(tags, 'tags')),
    (_event, id, tags) => {
      repo.updateTags(id, tags);
      notifyUpserted(id);
    },
  );

  // Generated on the spot when missing: books added before thumbnails existed, or by an import
  // whose rebuild hasn't reached them yet.
  handle(LIBRARY_CHANNELS.thumbnail, args(idArg), (_event, id) => {
    const entry = repo.get(id);
    return entry ? thumbnails.ensure(entry.path) : null;
  });

  handle(LIBRARY_CHANNELS.updateMetadata, args(idArg, expectMetadataUpdate), (_event, id, update) => {
    const updated = repo.updateMetadata(id, update);
    if (updated) notify({ scope: 'library', upserted: [updated] });
    return updated;
  });
}

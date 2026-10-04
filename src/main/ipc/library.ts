import { stat } from 'node:fs/promises';
import path from 'node:path';

import { SUPPORTED_COMIC_EXTENSIONS } from '../../shared/comic';
import { t } from '../../shared/i18n';
import type { AddFileResult, ResyncResult, ScanProgress, ScanResult } from '../../shared/library';
import type { LibraryFolderRepository } from '../db/library-folder-repository';
import type { LibraryRepository } from '../db/library-repository';
import type { SettingsRepository } from '../db/settings-repository';
import type { DecoderClient } from '../decoder/decoder-client';
import { openErrorMessage } from '../services/open-error';
import { scanIntoLibrary } from '../services/library-scanner';
import { resyncLibrary } from '../services/library-sync';
import { lastOpenedDirectory } from './comic';
import type { NotifyDataChange } from './data-changes';
import { existingDirectory, openDialogFor } from './dialogs';
import { handle } from './handle';
import {
  MAX_PATH_LENGTH,
  args,
  expectInteger,
  expectMetadataUpdate,
  expectNonEmptyString,
  expectStringArray,
  idArg,
  pageIndexArg,
} from './validate';

// Channel names are shared with preload.ts: keep them in sync.
export const LIBRARY_CHANNELS = {
  list: 'library:list',
  addFile: 'library:add-file',
  addFolder: 'library:add-folder',
  /** Main → renderer, while `addFolder` runs. */
  scanProgress: 'library:scan-progress',
  remove: 'library:remove',
  listFolders: 'library:list-folders',
  removeFolder: 'library:remove-folder',
  resync: 'library:resync',
  updateProgress: 'library:update-progress',
  updateRating: 'library:update-rating',
  updateTags: 'library:update-tags',
  updateMetadata: 'library:update-metadata',
  thumbnail: 'library:thumbnail',
} as const;

/** Everything a resynchronization needs; built once in `main.ts`. */
export interface Resynchronizer {
  /**
   * Walks the library's folders again (new comics added, comics whose file is gone removed), stores
   * the date in `lastResyncAt` and tells the views. Only one runs at a time: a call during another
   * one resolves to an error result.
   */
  run(onProgress?: (progress: ScanProgress) => void): Promise<ResyncResult>;
}

export function createResynchronizer(
  repo: LibraryRepository,
  folders: LibraryFolderRepository,
  settings: SettingsRepository,
  decoder: DecoderClient,
  notify: NotifyDataChange,
): Resynchronizer {
  let running = false;

  return {
    async run(onProgress = () => undefined) {
      if (running) return { status: 'error', message: t('errors:library.resyncRunning') };
      running = true;
      try {
        const summary = await resyncLibrary(repo, folders.list(), onProgress, (filePath) => decoder.inspect(filePath));
        const finishedAt = new Date().toISOString();
        settings.set('lastResyncAt', finishedAt);

        notify({ scope: 'library' });
        notify({ scope: 'settings', values: { lastResyncAt: finishedAt } });
        if (summary.removed > 0) {
          // The removed books left the reading lists they were in, and their covers are useless.
          notify({ scope: 'readingLists' });
          await Promise.all(summary.removedEntries.map((entry) => decoder.removeThumbnail(entry.path).catch(() => undefined)));
        }
        return {
          status: 'ok',
          added: summary.added,
          removed: summary.removed,
          failed: summary.failed,
          unreachable: summary.unreachable,
          finishedAt,
        };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
      } finally {
        running = false;
      }
    },
  };
}

export function registerLibraryIpc(
  repo: LibraryRepository,
  folders: LibraryFolderRepository,
  resynchronizer: Resynchronizer,
  settingsRepo: SettingsRepository,
  decoder: DecoderClient,
  notify: NotifyDataChange,
): void {
  /** Announces the new state of entries a handler just wrote (the ones that still exist). */
  const notifyUpserted = (...ids: string[]) => {
    const upserted = ids.flatMap((id) => repo.get(id) ?? []);
    if (upserted.length > 0) notify({ scope: 'library', upserted });
  };

  handle(LIBRARY_CHANNELS.list, args(), () => repo.list());

  handle(LIBRARY_CHANNELS.addFile, args(), async (event): Promise<AddFileResult> => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:addFile'),
      properties: ['openFile'],
      filters: [{ name: t('dialogs:comicFiles'), extensions: [...SUPPORTED_COMIC_EXTENSIONS] }],
      defaultPath: await lastOpenedDirectory(repo),
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const filePath = filePaths[0];
    const title = path.basename(filePath, path.extname(filePath));
    if (repo.hasPath(filePath)) {
      return { status: 'exists', title };
    }
    try {
      // Same path as a scanned file: the decoder counts the pages and caches the cover.
      const { pageCount, fileCount } = await decoder.inspect(filePath);
      const { size } = await stat(filePath);
      repo.register(filePath, title, pageCount, fileCount, size);
    } catch (error) {
      return { status: 'error', message: openErrorMessage(error) };
    }
    // New row: the library slice reloads (a targeted upsert would need the entry's id).
    notify({ scope: 'library' });
    return { status: 'added', title };
  });

  handle(LIBRARY_CHANNELS.addFolder, args(), async (event): Promise<ScanResult> => {
    const options: Electron.OpenDialogOptions = {
      title: t('dialogs:addFolder'),
      properties: ['openDirectory'],
      // Where the previous folder was added, when it is still there.
      defaultPath: await existingDirectory(settingsRepo.getAll().lastScanFolder),
    };
    const { canceled, filePaths } = await openDialogFor(event, options);
    if (canceled || filePaths.length === 0) {
      return { status: 'cancelled' };
    }

    const directory = filePaths[0];
    settingsRepo.set('lastScanFolder', directory);
    notify({ scope: 'settings', values: { lastScanFolder: directory } });
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
    folders.add(directory);
    notify({ scope: 'library' });
    return { status: 'ok', directory, ...summary };
  });

  handle(LIBRARY_CHANNELS.listFolders, args(), () => folders.list());

  handle(
    LIBRARY_CHANNELS.removeFolder,
    args((value) => expectNonEmptyString(value, 'folder', MAX_PATH_LENGTH)),
    (_event, folder) => folders.remove(folder),
  );

  handle(LIBRARY_CHANNELS.resync, args(), (event) =>
    resynchronizer.run((progress) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(LIBRARY_CHANNELS.scanProgress, progress);
      }
    }),
  );

  handle(LIBRARY_CHANNELS.remove, args(idArg), async (_event, id) => {
    const entry = repo.get(id);
    repo.remove(id);
    notify({ scope: 'library', removed: [id] });
    // The book left the reading lists it was in.
    notify({ scope: 'readingLists' });
    if (entry) {
      await decoder.removeThumbnail(entry.path).catch(() => undefined);
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
    return entry ? decoder.thumbnail(entry.path).catch(() => null) : null;
  });

  handle(LIBRARY_CHANNELS.updateMetadata, args(idArg, expectMetadataUpdate), (_event, id, update) => {
    const updated = repo.updateMetadata(id, update);
    if (updated) notify({ scope: 'library', upserted: [updated] });
    return updated;
  });
}

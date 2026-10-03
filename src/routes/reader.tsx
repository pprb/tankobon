import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ContinuousReader } from '@/components/reader/continuous-reader';
import { SinglePageReader } from '@/components/reader/single-page-reader';
import { Button } from '@/components/ui/button';
import { useComic } from '@/hooks/use-comic';
import { useNextInList } from '@/hooks/use-next-in-list';
import { useReaderFullscreen } from '@/hooks/use-reader-fullscreen';
import { useSettings } from '@/hooks/use-settings';

interface ReaderSearch {
  /** Absolute path of a comic to open automatically, e.g. from the library page. */
  path?: string;
  /** Id of the reading list the comic was opened from: its next book is offered on the last page. */
  list?: string;
}

export const Route = createFileRoute('/reader')({
  validateSearch: (search: Record<string, unknown>): ReaderSearch => ({
    path: typeof search.path === 'string' ? search.path : undefined,
    list: typeof search.list === 'string' ? search.list : undefined,
  }),
  component: ReaderPage,
});

function ReaderPage() {
  const { path, list } = Route.useSearch();
  const { t } = useTranslation('reader');
  const { comic, page, pageUrl, error, loading, pickAndOpen, openFile, close, next, prev } = useComic();
  const { settings } = useSettings();
  const { fullscreen, toggle: toggleFullscreen } = useReaderFullscreen(comic !== null);
  const nextInList = useNextInList(list, comic?.libraryId);

  useEffect(() => {
    if (path) void openFile(path);
  }, [path, openFile]);

  // Continuous mode doesn't drive `page`/`goTo` (that would also re-trigger useComic's
  // own single-page fetch for no reason); it persists progress directly instead.
  const persistProgress = useCallback(
    (index: number) => {
      if (!comic) return;
      void window.tankobon.library.updateProgress(comic.libraryId, index);
    },
    [comic],
  );

  if (!comic) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('intro')}</p>
        <Button onClick={pickAndOpen} disabled={loading}>
          <FolderOpen />
          {t('openFile')}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  if (settings.readingMode === 'continuous') {
    return (
      <ContinuousReader
        key={comic.id}
        comic={comic}
        spacing={settings.pageSpacing}
        pickAndOpen={pickAndOpen}
        close={close}
        onActivePage={persistProgress}
        fullscreen={fullscreen}
        toggleFullscreen={toggleFullscreen}
        background={settings.readerBackground}
        nextInList={nextInList}
      />
    );
  }

  return (
    <SinglePageReader
      comic={comic}
      page={page}
      pageUrl={pageUrl}
      error={error}
      loading={loading}
      pickAndOpen={pickAndOpen}
      close={close}
      next={next}
      prev={prev}
      settings={settings}
      fullscreen={fullscreen}
      toggleFullscreen={toggleFullscreen}
      nextInList={nextInList}
    />
  );
}

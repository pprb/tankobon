import { FolderOpen, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContinuousPage } from '@/components/reader/continuous-page';
import { FullscreenButton } from '@/components/reader/fullscreen-button';
import { NextInListButton } from '@/components/reader/next-in-list-button';
import { ReaderHeader } from '@/components/reader/reader-header';
import { ReadingProgress } from '@/components/reader/reading-progress';
import { Button } from '@/components/ui/button';
import type { NextInList } from '@/hooks/use-next-in-list';
import { useReadingPace } from '@/hooks/use-reading-pace';
import { useResumeScroll } from '@/hooks/use-resume-scroll';
import type { ComicInfo } from '@/shared/comic';

interface ContinuousReaderProps {
  comic: ComicInfo;
  spacing: number;
  pickAndOpen: () => void;
  close: () => void;
  onActivePage: (index: number) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  background: string;
  nextInList: NextInList | null;
}

export function ContinuousReader({
  comic,
  spacing,
  pickAndOpen,
  close,
  onActivePage,
  fullscreen,
  toggleFullscreen,
  background,
  nextInList,
}: ContinuousReaderProps) {
  const { t } = useTranslation('reader');
  const [visiblePage, setVisiblePage] = useState(comic.resumePage);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  useResumeScroll(scrollRef, columnRef, comic.resumePage);

  const handleActive = useCallback(
    (index: number) => {
      setVisiblePage(index);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onActivePage(index), 400);
    },
    [onActivePage],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const { percent, remainingMinutes } = useReadingPace(comic.id, comic.pageCount, visiblePage);

  return (
    <div className="relative flex h-full flex-col" style={{ backgroundColor: background }}>
      <ReaderHeader fullscreen={fullscreen}>
        <span className="truncate font-medium" title={comic.path}>
          {comic.title}
        </span>
        <span className="ml-auto tabular-nums text-white/60">
          {visiblePage + 1} / {comic.pageCount}
        </span>
        <ReadingProgress percent={percent} remainingMinutes={remainingMinutes} />
        {visiblePage === comic.pageCount - 1 && <NextInListButton nextInList={nextInList} />}
        <Button variant="ghost" size="icon-sm" onClick={pickAndOpen} title={t('openAnother')}>
          <FolderOpen />
        </Button>
        <FullscreenButton fullscreen={fullscreen} toggle={toggleFullscreen} />
        <Button variant="ghost" size="icon-sm" onClick={close} title={t('close')}>
          <X />
        </Button>
      </ReaderHeader>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div ref={columnRef} className="mx-auto flex flex-col items-center" style={{ rowGap: spacing }}>
          {Array.from({ length: comic.pageCount }, (_, index) => (
            <ContinuousPage key={index} comicId={comic.id} index={index} onActive={handleActive} />
          ))}
        </div>
      </div>
    </div>
  );
}

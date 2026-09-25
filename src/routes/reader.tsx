import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, FolderOpen, Loader2, Maximize, Minimize, X, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { useComic } from '@/hooks/use-comic';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useImageUpscaler } from '@/hooks/use-image-upscaler';
import { formatRemainingTime, useReadingPace } from '@/hooks/use-reading-pace';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';
import { createWheelPager } from '@/lib/wheel-pager';
import type { ComicInfo } from '@/shared/comic';
import type { AppSettings } from '@/shared/settings';

interface Size {
  width: number;
  height: number;
}

/** The size at which `natural` renders under `object-fit: contain` inside `container`. */
function fitSize(container: Size, natural: Size): Size {
  const containerRatio = container.width / container.height;
  const naturalRatio = natural.width / natural.height;
  return containerRatio > naturalRatio
    ? { width: container.height * naturalRatio, height: container.height }
    : { width: container.width, height: container.width / naturalRatio };
}

interface ReaderSearch {
  /** Absolute path of a comic to open automatically, e.g. from the library page. */
  path?: string;
}

export const Route = createFileRoute('/reader')({
  validateSearch: (search: Record<string, unknown>): ReaderSearch => ({
    path: typeof search.path === 'string' ? search.path : undefined,
  }),
  component: ReaderPage,
});

/** `'fit'` scales the page to the available area; a number is a fraction of its actual pixel size. */
type Zoom = 'fit' | number;

const ZOOM_OPTIONS: { value: Zoom; label: string }[] = [
  { value: 'fit', label: 'Ajuster à la fenêtre' },
  { value: 0.5, label: '50 %' },
  { value: 0.75, label: '75 %' },
  { value: 0.9, label: '90 %' },
  { value: 1, label: 'Taille réelle (100 %)' },
  { value: 1.1, label: '110 %' },
  { value: 1.25, label: '125 %' },
  { value: 1.5, label: '150 %' },
  { value: 2, label: '200 %' },
];

/** Progress % and estimated remaining reading time, shared by both reader modes. */
function ReadingProgress({ percent, remainingMinutes }: { percent: number; remainingMinutes: number | null }) {
  return (
    <span
      className="tabular-nums text-white/60"
      title={
        remainingMinutes !== null
          ? `Temps de lecture restant estimé : ${formatRemainingTime(remainingMinutes)}`
          : 'Avancement dans le livre'
      }
    >
      {Math.round(percent)} %{remainingMinutes !== null && <> · ~{formatRemainingTime(remainingMinutes)}</>}
    </span>
  );
}

/** Fullscreen toggle button, shared by both reader modes. */
function FullscreenButton({ fullscreen, toggle }: { fullscreen: boolean; toggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      title={fullscreen ? 'Quitter le plein écran (Échap ou F)' : 'Plein écran (F)'}
    >
      {fullscreen ? <Minimize /> : <Maximize />}
    </Button>
  );
}

/**
 * The reader's top bar. In fullscreen it detaches from the layout and floats over the
 * page, invisible until the mouse reaches the top edge, so the page gets the whole screen.
 */
function ReaderHeader({ fullscreen, children }: { fullscreen: boolean; children: ReactNode }) {
  return (
    <header
      className={cn(
        'flex items-center gap-2 border-b border-white/10 bg-black px-3 py-2 text-sm text-white',
        fullscreen && 'absolute inset-x-0 top-0 z-10 bg-black/80 opacity-0 transition-opacity hover:opacity-100',
      )}
    >
      {children}
    </header>
  );
}

/** Toggles fullscreen on `F`/`F11` while a comic is open; leaves fullscreen once it's closed. */
function useReaderFullscreen(comicOpen: boolean) {
  const { fullscreen, toggle, exit } = useFullscreen();

  useEffect(() => {
    if (!comicOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F' || event.key === 'F11') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [comicOpen, toggle]);

  // Closing the comic or leaving the reader route shouldn't strand the window in fullscreen.
  useEffect(() => {
    if (!comicOpen) exit();
    return exit;
  }, [comicOpen, exit]);

  return { fullscreen, toggle };
}

function ReaderPage() {
  const { path } = Route.useSearch();
  const { comic, page, pageUrl, error, loading, pickAndOpen, openFile, close, next, prev } = useComic();
  const { settings } = useSettings();
  const { fullscreen, toggle: toggleFullscreen } = useReaderFullscreen(comic !== null);

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
        <h1 className="text-2xl font-semibold tracking-tight">Lecteur</h1>
        <p className="text-muted-foreground">Ouvre un fichier CBZ ou CBR pour commencer la lecture.</p>
        <Button onClick={pickAndOpen} disabled={loading}>
          <FolderOpen />
          Ouvrir un fichier
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
    />
  );
}

interface SinglePageReaderProps {
  comic: ComicInfo;
  page: number;
  pageUrl: string | null;
  error: string | null;
  loading: boolean;
  pickAndOpen: () => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  settings: AppSettings;
  fullscreen: boolean;
  toggleFullscreen: () => void;
}

function SinglePageReader({
  comic,
  page,
  pageUrl,
  error,
  loading,
  pickAndOpen,
  close,
  next,
  prev,
  settings,
  fullscreen,
  toggleFullscreen,
}: SinglePageReaderProps) {
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [upscaleEnabled, setUpscaleEnabled] = useState(false);
  const [naturalSizeState, setNaturalSizeState] = useState<{ src: string; size: Size } | null>(null);
  const naturalSize = naturalSizeState?.src === pageUrl ? naturalSizeState.size : null;
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rtl = settings.readingDirection === 'rtl';
  // In right-to-left (manga) reading order, the physical left/right controls swap.
  const advance = rtl ? prev : next;
  const retreat = rtl ? next : prev;
  const zoomFraction = zoom === 'fit' ? null : zoom;

  // Track the page's real pixel size, independent of whichever asset (original or
  // AI-upscaled) ends up on screen, so zoom math always refers to the original.
  // Keyed by src rather than reset-then-set, so a stale size never renders past a page change.
  useEffect(() => {
    if (!pageUrl) return;
    let cancelled = false;
    const probe = new Image();
    probe.src = pageUrl;
    probe
      .decode()
      .then(() => {
        if (!cancelled) {
          setNaturalSizeState({ src: pageUrl, size: { width: probe.naturalWidth, height: probe.naturalHeight } });
        }
      })
      .catch(() => {
        /* ignored: falls back to no upscaling if the size can't be read */
      });
    return () => {
      cancelled = true;
    };
  }, [pageUrl]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wheel-to-turn-page: while zoomed in, a scroll that can still pan the image is left
  // alone; only once the pan hits the edge (or in "fit" mode, where there's no pan at
  // all) does the wheel turn the page. `createWheelPager` keeps one trackpad swipe (many
  // wheel events, plus the OS's inertia tail) to exactly one page turn. It lives in state,
  // not inside the effect: `advance`/`retreat` change identity on every render, so the
  // effect re-runs after each page turn and a fresh pager would forget the gesture in
  // progress — letting its inertia turn the page again.
  const [pager] = useState(createWheelPager);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const inverted = settings.scrollDirection === 'inverted';

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      // Fed even for events that only pan, so a swipe that pans up to the edge doesn't
      // then turn the page with its own inertia: that takes a new gesture.
      const step = pager(event.deltaY, event.timeStamp);

      if (zoomFraction !== null) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
          return;
        }
      }

      event.preventDefault();
      if (step === 0) return;

      const goForward = inverted ? step < 0 : step > 0;
      if (goForward) advance();
      else retreat();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomFraction, settings.scrollDirection, advance, retreat, pager]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault();
          advance();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          retreat();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, retreat]);

  const displaySize =
    naturalSize &&
    (zoomFraction === null
      ? containerSize && fitSize(containerSize, naturalSize)
      : { width: naturalSize.width * zoomFraction, height: naturalSize.height * zoomFraction });

  // The exact condition the zoom/upscale option targets: the page is being stretched
  // past its native resolution, so AI upscaling can genuinely add detail.
  const needsUpscale = !!(displaySize && naturalSize && displaySize.width > naturalSize.width + 0.5);

  const {
    upscaledUrl,
    isUpscaling,
    error: upscaleError,
  } = useImageUpscaler(pageUrl, upscaleEnabled && needsUpscale);

  const { percent, remainingMinutes } = useReadingPace(comic.id, comic.pageCount, page);

  const isFirst = page === 0;
  const isLast = page === comic.pageCount - 1;
  const isPrevDisabled = rtl ? isLast : isFirst;
  const isNextDisabled = rtl ? isFirst : isLast;
  const isFit = zoomFraction === null;
  const displayUrl = upscaledUrl ?? pageUrl;

  return (
    <div className="relative flex h-full flex-col" style={{ backgroundColor: settings.readerBackground }}>
      <ReaderHeader fullscreen={fullscreen}>
        <span className="truncate font-medium" title={comic.path}>
          {comic.title}
        </span>
        <span className="ml-auto tabular-nums text-white/60">
          {page + 1} / {comic.pageCount}
        </span>
        <ReadingProgress percent={percent} remainingMinutes={remainingMinutes} />
        <label className="flex items-center gap-1.5 text-white/60">
          <ZoomIn className="size-4" />
          <span className="sr-only">Zoom</span>
          <select
            value={String(zoom)}
            onChange={(event) => setZoom(event.target.value === 'fit' ? 'fit' : Number(event.target.value))}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
          >
            {ZOOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-foreground">
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label
          className={cn(
            'flex items-center gap-1.5',
            upscaleError ? 'text-destructive' : needsUpscale ? 'text-white/60' : 'text-white/30',
          )}
          title={
            upscaleError ??
            "Améliore la netteté de l'image agrandie grâce à un modèle d'IA local (aucune donnée envoyée en ligne)"
          }
        >
          <input
            type="checkbox"
            checked={upscaleEnabled}
            disabled={!needsUpscale}
            onChange={(event) => setUpscaleEnabled(event.target.checked)}
          />
          {isUpscaling ? (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" />
              Amélioration…
            </span>
          ) : upscaleError ? (
            'Amélioration indisponible'
          ) : (
            'Améliorer (IA)'
          )}
        </label>
        <Button variant="ghost" size="icon-sm" onClick={pickAndOpen} title="Ouvrir un autre fichier">
          <FolderOpen />
        </Button>
        <FullscreenButton fullscreen={fullscreen} toggle={toggleFullscreen} />
        <Button variant="ghost" size="icon-sm" onClick={close} title="Fermer">
          <X />
        </Button>
      </ReaderHeader>

      <div
        ref={containerRef}
        className={cn(
          'relative flex min-h-0 flex-1',
          isFit ? 'items-center justify-center' : 'items-start justify-start overflow-auto',
        )}
      >
        {pageUrl && (
          <img
            src={displayUrl ?? undefined}
            alt={`Page ${page + 1}`}
            draggable={false}
            className={isFit ? 'h-full w-full object-contain' : 'max-w-none'}
            style={
              zoomFraction === null
                ? undefined
                : naturalSize
                  ? { width: naturalSize.width * zoomFraction, height: naturalSize.height * zoomFraction }
                  : { transform: `scale(${zoomFraction})`, transformOrigin: 'top left' }
            }
          />
        )}
        {loading && !pageUrl && <p className="text-neutral-500">Chargement…</p>}
        {error && <p className="absolute bottom-4 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={retreat}
          disabled={isPrevDisabled}
          aria-label="Page précédente"
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize text-neutral-500 opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronLeft className="mx-4 size-8" />
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={isNextDisabled}
          aria-label="Page suivante"
          className="absolute inset-y-0 right-0 flex w-1/4 cursor-e-resize justify-end text-neutral-500 opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronRight className="mx-4 size-8 self-center" />
        </button>
      </div>
    </div>
  );
}

interface ContinuousReaderProps {
  comic: ComicInfo;
  spacing: number;
  pickAndOpen: () => void;
  close: () => void;
  onActivePage: (index: number) => void;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  background: string;
}

function ContinuousReader({
  comic,
  spacing,
  pickAndOpen,
  close,
  onActivePage,
  fullscreen,
  toggleFullscreen,
  background,
}: ContinuousReaderProps) {
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
        <Button variant="ghost" size="icon-sm" onClick={pickAndOpen} title="Ouvrir un autre fichier">
          <FolderOpen />
        </Button>
        <FullscreenButton fullscreen={fullscreen} toggle={toggleFullscreen} />
        <Button variant="ghost" size="icon-sm" onClick={close} title="Fermer">
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

/**
 * Scrolls the continuous reader to `resumePage` when a comic opens, and keeps that page
 * pinned to the top while pages load: every page starts as a fixed-height placeholder,
 * so pages above it (preloaded thanks to the observer's `rootMargin`) change height once
 * their image arrives and would otherwise push the resumed page out of view. Pinning stops
 * as soon as the user scrolls on their own.
 *
 * Runs as a layout effect so the first scroll happens before the page observers' first
 * (asynchronous) callbacks: page 0 is never reported as active, so the saved progress
 * isn't overwritten with the start of the book.
 */
function useResumeScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  columnRef: RefObject<HTMLDivElement | null>,
  resumePage: number,
) {
  useLayoutEffect(() => {
    const container = scrollRef.current;
    const column = columnRef.current;
    const target = column?.children[resumePage];
    if (!container || !column || !target || resumePage === 0) return;

    const pin = () => {
      container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top;
    };
    pin();

    const resizeObserver = new ResizeObserver(pin);
    resizeObserver.observe(column);

    const stop = () => {
      resizeObserver.disconnect();
      container.removeEventListener('wheel', stop);
      container.removeEventListener('pointerdown', stop);
      container.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
    container.addEventListener('wheel', stop, { passive: true });
    container.addEventListener('pointerdown', stop);
    container.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);
    return stop;
  }, [scrollRef, columnRef, resumePage]);
}

interface ContinuousPageProps {
  comicId: string;
  index: number;
  onActive: (index: number) => void;
}

function ContinuousPage({ comicId, index, onActive }: ContinuousPageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  // Two observers: one preloads well before the page is visible, the other (tighter
  // threshold) tracks which page actually counts as "current" for resuming later.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: '800px 0px' },
    );
    const activeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onActive(index);
      },
      { threshold: 0.5 },
    );
    loadObserver.observe(el);
    activeObserver.observe(el);
    return () => {
      loadObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [index, onActive]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    window.tankobon.comic
      .readPage(comicId, index)
      .then(({ data, mimeType }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: mimeType }));
        setUrl(objectUrl);
      })
      .catch(() => {
        /* leaves the placeholder in place */
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shouldLoad, comicId, index]);

  return (
    <div ref={ref} className="w-full max-w-full">
      {url ? (
        <img src={url} alt={`Page ${index + 1}`} draggable={false} className="block w-full" />
      ) : (
        <div className="flex h-[60vh] w-full items-center justify-center text-neutral-500">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
    </div>
  );
}

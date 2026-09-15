import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, FolderOpen, Loader2, X, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useComic } from '@/hooks/use-comic';
import { useImageUpscaler } from '@/hooks/use-image-upscaler';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

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

function ReaderPage() {
  const { path } = Route.useSearch();
  const { comic, page, pageUrl, error, loading, pickAndOpen, openFile, close, next, prev } = useComic();
  const { settings } = useSettings();
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

  useEffect(() => {
    if (path) void openFile(path);
  }, [path, openFile]);

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
    // Depends on `comic`: the container only mounts once a comic is open.
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [comic]);

  // Wheel-to-turn-page: while zoomed in, a scroll that can still pan the image is left
  // alone; only once the pan hits the edge (or in "fit" mode, where there's no pan at
  // all) does the wheel turn the page. A short cooldown keeps one trackpad swipe (many
  // wheel events) to exactly one page turn.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !comic) return;
    const inverted = settings.scrollDirection === 'inverted';
    let cooldownUntil = 0;

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      if (zoomFraction !== null) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
          return;
        }
      }

      event.preventDefault();
      const now = Date.now();
      if (now < cooldownUntil) return;
      cooldownUntil = now + 450;

      const goForward = inverted ? event.deltaY < 0 : event.deltaY > 0;
      if (goForward) advance();
      else retreat();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [comic, zoomFraction, settings.scrollDirection, advance, retreat]);

  useEffect(() => {
    if (!comic) return;
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
  }, [comic, advance, retreat]);

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

  if (!comic) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Lecteur</h1>
        <p className="text-muted-foreground">Ouvre un fichier CBZ pour commencer la lecture.</p>
        <Button onClick={pickAndOpen} disabled={loading}>
          <FolderOpen />
          Ouvrir un fichier
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const isFirst = page === 0;
  const isLast = page === comic.pageCount - 1;
  const isPrevDisabled = rtl ? isLast : isFirst;
  const isNextDisabled = rtl ? isFirst : isLast;
  const isFit = zoomFraction === null;
  const displayUrl = upscaledUrl ?? pageUrl;

  return (
    <div className="flex h-full flex-col bg-black text-white">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm">
        <span className="truncate font-medium" title={comic.path}>
          {comic.title}
        </span>
        <span className="ml-auto tabular-nums text-white/60">
          {page + 1} / {comic.pageCount}
        </span>
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
        <Button variant="ghost" size="icon-sm" onClick={close} title="Fermer">
          <X />
        </Button>
      </header>

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
            className={isFit ? 'h-full w-full object-contain' : undefined}
            style={
              zoomFraction === null
                ? undefined
                : naturalSize
                  ? { width: naturalSize.width * zoomFraction, height: naturalSize.height * zoomFraction }
                  : { transform: `scale(${zoomFraction})`, transformOrigin: 'top left' }
            }
          />
        )}
        {loading && !pageUrl && <p className="text-white/60">Chargement…</p>}
        {error && <p className="absolute bottom-4 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={retreat}
          disabled={isPrevDisabled}
          aria-label="Page précédente"
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronLeft className="mx-4 size-8" />
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={isNextDisabled}
          aria-label="Page suivante"
          className="absolute inset-y-0 right-0 flex w-1/4 cursor-e-resize justify-end opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronRight className="mx-4 size-8 self-center" />
        </button>
      </div>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, FolderOpen, X, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useComic } from '@/hooks/use-comic';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

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
  const rtl = settings.readingDirection === 'rtl';
  // In right-to-left (manga) reading order, the physical left/right controls swap.
  const advance = rtl ? prev : next;
  const retreat = rtl ? next : prev;

  useEffect(() => {
    if (path) void openFile(path);
  }, [path, openFile]);

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
  const isFit = zoom === 'fit';

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
        <Button variant="ghost" size="icon-sm" onClick={pickAndOpen} title="Ouvrir un autre fichier">
          <FolderOpen />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={close} title="Fermer">
          <X />
        </Button>
      </header>

      <div
        className={cn(
          'relative flex min-h-0 flex-1',
          isFit ? 'items-center justify-center' : 'items-start justify-start overflow-auto',
        )}
      >
        {pageUrl && (
          <img
            src={pageUrl}
            alt={`Page ${page + 1}`}
            draggable={false}
            className={isFit ? 'h-full w-full object-contain' : undefined}
            style={isFit ? undefined : { transform: `scale(${zoom})`, transformOrigin: 'top left' }}
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

import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, FolderOpen, X } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useComic } from '@/hooks/use-comic';

export const Route = createFileRoute('/reader')({
  component: ReaderPage,
});

function ReaderPage() {
  const { comic, page, pageUrl, error, loading, pickAndOpen, close, next, prev } = useComic();

  useEffect(() => {
    if (!comic) return;
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          prev();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [comic, next, prev]);

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

  return (
    <div className="flex h-full flex-col bg-black text-white">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-sm">
        <span className="truncate font-medium" title={comic.path}>
          {comic.title}
        </span>
        <span className="ml-auto tabular-nums text-white/60">
          {page + 1} / {comic.pageCount}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={pickAndOpen} title="Ouvrir un autre fichier">
          <FolderOpen />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={close} title="Fermer">
          <X />
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {pageUrl && (
          <img
            src={pageUrl}
            alt={`Page ${page + 1}`}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}
        {loading && !pageUrl && <p className="text-white/60">Chargement…</p>}
        {error && <p className="absolute bottom-4 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={prev}
          disabled={isFirst}
          aria-label="Page précédente"
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronLeft className="mx-4 size-8" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={isLast}
          aria-label="Page suivante"
          className="absolute inset-y-0 right-0 flex w-1/4 cursor-e-resize justify-end opacity-0 transition hover:opacity-100 disabled:hidden"
        >
          <ChevronRight className="mx-4 size-8 self-center" />
        </button>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, GripVertical, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ReadingListProgress } from '@/components/reading-list-progress';
import { Button } from '@/components/ui/button';
import { notifyReadingListsChanged } from '@/hooks/use-reading-lists';
import { isFinished, listEntries, listProgress, moveUnfinished, nextToRead } from '@/lib/reading-list';
import { cn } from '@/lib/utils';
import type { LibraryEntry } from '@/shared/library';
import { MAX_READING_LIST_SIZE, type ReadingList, type ReadingListResult } from '@/shared/reading-list';

export const Route = createFileRoute('/lists/$listId')({
  component: ReadingListPage,
});

function ReadingListPage() {
  const { listId } = Route.useParams();
  const navigate = useNavigate();
  // undefined while loading, null once the list turns out not to exist.
  const [list, setList] = useState<ReadingList | null | undefined>(undefined);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);

  const refresh = useCallback(() => {
    void Promise.all([window.tankobon.readingLists.list(), window.tankobon.library.list()]).then(
      ([lists, fetchedLibrary]) => {
        setList(lists.find((l) => l.id === listId) ?? null);
        setLibrary(fetchedLibrary);
      },
    );
  }, [listId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const entries = useMemo(() => (list ? listEntries(list, library) : []), [list, library]);
  const finished = useMemo(() => new Set(entries.filter(isFinished).map((entry) => entry.id)), [entries]);
  const next = nextToRead(entries);

  if (list === undefined) return null;
  if (list === null) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <BackLink />
        <p className="text-sm text-muted-foreground">Cette liste de lecture n'existe plus.</p>
      </div>
    );
  }

  const apply = (result: ReadingListResult) => {
    if (result.status === 'error') {
      setError(result.message);
      refresh();
      return;
    }
    setError(null);
    setList(result.list);
  };

  // Ids of the books actually shown: ids of entries gone from the library are left out.
  const order = entries.map((entry) => entry.id);

  const move = async (from: number, to: number) => {
    const reordered = moveUnfinished(order, finished, from, to);
    if (!reordered) return;
    // The ids missing from the library keep their place at the end; the repository wants them all.
    const missing = list.entryIds.filter((id) => !order.includes(id));
    setList({ ...list, entryIds: [...reordered, ...missing] });
    apply(await window.tankobon.readingLists.reorder(list.id, [...reordered, ...missing]));
  };

  /** The nearest unfinished book's index from `index` in direction `step`, for the arrow buttons. */
  const neighbour = (index: number, step: 1 | -1): number | null => {
    for (let i = index + step; i >= 0 && i < order.length; i += step) {
      if (!finished.has(order[i])) return i;
    }
    return null;
  };

  const rename = async () => {
    if (renaming === null) return;
    apply(await window.tankobon.readingLists.rename(list.id, renaming));
    setRenaming(null);
    notifyReadingListsChanged();
  };

  const removeList = async () => {
    if (!window.confirm(`Supprimer la liste « ${list.name} » ? Les livres restent dans la bibliothèque.`)) return;
    await window.tankobon.readingLists.remove(list.id);
    notifyReadingListsChanged();
    void navigate({ to: '/lists' });
  };

  const read = (entry: LibraryEntry) => navigate({ to: '/reader', search: { path: entry.path, list: list.id } });

  return (
    <div className="flex flex-col gap-4 p-6">
      <BackLink />
      <div className="flex items-center gap-2">
        {renaming === null ? (
          <>
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{list.name}</h1>
            <Button variant="ghost" size="icon-sm" onClick={() => setRenaming(list.name)} title="Renommer la liste">
              <Pencil />
            </Button>
          </>
        ) : (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void rename();
            }}
          >
            <input
              autoFocus
              value={renaming}
              onChange={(event) => setRenaming(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setRenaming(null)}
              aria-label="Nom de la liste"
              className="h-9 max-w-md flex-1 rounded-md border bg-background px-3 text-lg font-semibold outline-none focus-visible:border-ring"
            />
            <Button type="submit" size="sm" disabled={renaming.trim() === ''}>
              Renommer
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRenaming(null)}>
              Annuler
            </Button>
          </form>
        )}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void removeList()}>
          <Trash2 />
          Supprimer la liste
        </Button>
      </div>

      <div className="max-w-xl">
        <ReadingListProgress progress={listProgress(entries)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {entries.length} / {MAX_READING_LIST_SIZE} livres. Les livres lus (dernière page atteinte ou étiquette « Lu »)
        restent à leur place ; les autres se réordonnent par glisser-déposer ou avec les flèches.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Liste vide : ajoute des livres depuis la bibliothèque (bouton « Ajouter à une liste de lecture »).
        </p>
      ) : (
        <ol className="flex flex-col divide-y rounded-md border">
          {entries.map((entry, index) => {
            const done = finished.has(entry.id);
            const isNext = next?.id === entry.id;
            const up = done ? null : neighbour(index, -1);
            const down = done ? null : neighbour(index, 1);
            return (
              <li
                key={entry.id}
                draggable={!done}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  setDragged(index);
                }}
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => {
                  // Only unfinished books are drop targets: finished ones keep their place.
                  if (dragged !== null && !done) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged !== null) void move(dragged, index);
                  setDragged(null);
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2',
                  done && 'opacity-50',
                  isNext && 'bg-primary/5',
                  dragged === index && 'opacity-30',
                )}
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                {done ? (
                  <Check className="size-4 shrink-0 text-muted-foreground" aria-label="Lu" />
                ) : (
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-medium', done && 'line-through')} title={entry.path}>
                    {entry.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {done ? 'Lu' : `Page ${entry.currentPage + 1} / ${entry.pageCount}`}
                    {isNext && ' · À suivre'}
                  </p>
                </div>
                {!done && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={up === null}
                      onClick={() => up !== null && void move(index, up)}
                      aria-label="Monter"
                      title="Monter"
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={down === null}
                      onClick={() => down !== null && void move(index, down)}
                      aria-label="Descendre"
                      title="Descendre"
                    >
                      <ArrowDown />
                    </Button>
                  </>
                )}
                <Button variant={isNext ? 'default' : 'secondary'} size="sm" onClick={() => void read(entry)}>
                  {isNext && <BookOpen />}
                  {isNext ? 'Lire' : 'Ouvrir'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={async () => apply(await window.tankobon.readingLists.removeEntry(list.id, entry.id))}
                  title="Retirer de la liste"
                  aria-label="Retirer de la liste"
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/lists" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      Listes de lecture
    </Link>
  );
}

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ReadingListProgress } from '@/components/reading-list-progress';
import { Button } from '@/components/ui/button';
import { notifyReadingListsChanged, onReadingListsChanged } from '@/hooks/use-reading-lists';
import { listEntries, listProgress, nextToRead } from '@/lib/reading-list';
import type { LibraryEntry } from '@/shared/library';
import { MAX_READING_LIST_SIZE, type ReadingList } from '@/shared/reading-list';

export const Route = createFileRoute('/lists/')({
  component: ReadingListsPage,
});

function ReadingListsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ReadingList[] | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void Promise.all([window.tankobon.readingLists.list(), window.tankobon.library.list()]).then(
      ([fetchedLists, fetchedLibrary]) => {
        setLists(fetchedLists);
        setLibrary(fetchedLibrary);
      },
    );
  }, []);

  // Also reloads when the lists change elsewhere, e.g. reordered from the sidebar.
  useEffect(() => {
    refresh();
    return onReadingListsChanged(refresh);
  }, [refresh]);

  const create = async () => {
    const result = await window.tankobon.readingLists.create(newName);
    if (result.status === 'error') {
      setError(result.message);
      return;
    }
    setError(null);
    setNewName('');
    notifyReadingListsChanged();
  };

  const remove = async (list: ReadingList) => {
    if (!window.confirm(`Supprimer la liste « ${list.name} » ? Les livres restent dans la bibliothèque.`)) return;
    await window.tankobon.readingLists.remove(list.id);
    notifyReadingListsChanged();
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Listes de lecture</h1>
      <p className="text-muted-foreground">
        Des piles de livres à lire dans l'ordre, jusqu'à {MAX_READING_LIST_SIZE} par liste. Ajoute des livres depuis
        la bibliothèque.
      </p>

      <form
        className="flex max-w-md items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nom de la nouvelle liste"
          aria-label="Nom de la nouvelle liste"
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="submit" disabled={newName.trim() === ''}>
          <Plus />
          Créer
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {lists === null ? null : lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune liste de lecture pour le moment.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => {
            const entries = listEntries(list, library);
            const next = nextToRead(entries);
            return (
              <li key={list.id} className="flex flex-col gap-3 rounded-md border p-4">
                <div className="flex items-start gap-2">
                  <Link
                    to="/lists/$listId"
                    params={{ listId: list.id }}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {list.name}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void remove(list)}
                    title="Supprimer la liste"
                    aria-label={`Supprimer la liste ${list.name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <ReadingListProgress progress={listProgress(entries)} />
                {next ? (
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm" title={next.title}>
                      <span className="text-muted-foreground">À suivre : </span>
                      {next.title}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate({ to: '/reader', search: { path: next.path, list: list.id } })}
                    >
                      <BookOpen />
                      Lire
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {entries.length === 0 ? 'Liste vide.' : 'Liste terminée.'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

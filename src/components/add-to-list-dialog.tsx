import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { notifyReadingListsChanged } from '@/hooks/use-reading-lists';
import type { LibraryEntry } from '@/shared/library';
import { MAX_READING_LIST_SIZE, type ReadingList, type ReadingListResult } from '@/shared/reading-list';

/** Same order as `readingLists.list()`: oldest first. */
const byCreation = (a: ReadingList, b: ReadingList) => a.createdAt.localeCompare(b.createdAt);

/**
 * Puts a library entry in reading lists, or takes it out: one checkbox per list, plus a field
 * to create a new list that the book goes straight into. Changes are saved as they're made.
 */
export function AddToListDialog({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const [lists, setLists] = useState<ReadingList[] | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.tankobon.readingLists.list().then(setLists);
  }, []);

  const apply = (result: ReadingListResult): ReadingList | null => {
    if (result.status === 'error') {
      setError(result.message);
      return null;
    }
    setError(null);
    setLists((prev) => [...(prev ?? []).filter((list) => list.id !== result.list.id), result.list].sort(byCreation));
    return result.list;
  };

  const toggle = async (list: ReadingList) => {
    apply(
      list.entryIds.includes(entry.id)
        ? await window.tankobon.readingLists.removeEntry(list.id, entry.id)
        : await window.tankobon.readingLists.addEntry(list.id, entry.id),
    );
  };

  const create = async () => {
    const created = apply(await window.tankobon.readingLists.create(newName));
    if (created) {
      notifyReadingListsChanged();
      setNewName('');
      apply(await window.tankobon.readingLists.addEntry(created.id, entry.id));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Listes de lecture"
      description={entry.title}
      className="max-w-md"
    >
      {lists === null ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune liste pour le moment : crée la première ci-dessous.</p>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {lists.map((list) => {
            const included = list.entryIds.includes(entry.id);
            const full = !included && list.entryIds.length >= MAX_READING_LIST_SIZE;
            return (
              <li key={list.id}>
                <label
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent has-disabled:opacity-50"
                  title={full ? `Liste pleine (${MAX_READING_LIST_SIZE} livres au maximum)` : undefined}
                >
                  <input type="checkbox" checked={included} disabled={full} onChange={() => void toggle(list)} />
                  <span className="flex-1 truncate">{list.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {list.entryIds.length} / {MAX_READING_LIST_SIZE}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nouvelle liste"
          aria-label="Nom de la nouvelle liste"
          className="h-8 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring"
        />
        <Button type="submit" size="sm" disabled={newName.trim() === ''}>
          <Plus />
          Créer et ajouter
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Dialog>
  );
}

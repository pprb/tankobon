import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useReadingLists } from '@/hooks/use-reading-lists';
import type { LibraryEntry } from '@/shared/library';
import { MAX_READING_LIST_SIZE, type ReadingList, type ReadingListResult } from '@/shared/reading-list';

/**
 * Puts a library entry in reading lists, or takes it out: one checkbox per list, plus a field
 * to create a new list that the book goes straight into. Changes are saved as they're made.
 */
export function AddToListDialog({ entry, onClose }: { entry: LibraryEntry; onClose: () => void }) {
  const { t } = useTranslation(['lists', 'common']);
  const lists = useReadingLists();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apply = (result: ReadingListResult): ReadingList | null => {
    if (result.status === 'error') {
      setError(result.message);
      return null;
    }
    setError(null);
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
      setNewName('');
      apply(await window.tankobon.readingLists.addEntry(created.id, entry.id));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('title')}
      description={entry.title}
      className="max-w-md"
    >
      {lists === null ? (
        <p className="text-sm text-muted-foreground">{t('common:loading')}</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyInDialog')}</p>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {lists.map((list) => {
            const included = list.entryIds.includes(entry.id);
            const full = !included && list.entryIds.length >= MAX_READING_LIST_SIZE;
            return (
              <li key={list.id}>
                <label
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent has-disabled:opacity-50"
                  title={full ? t('full', { max: MAX_READING_LIST_SIZE }) : undefined}
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
          placeholder={t('newListPlaceholder')}
          aria-label={t('newListName')}
          className="h-8 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring"
        />
        <Button type="submit" size="sm" disabled={newName.trim() === ''}>
          <Plus />
          {t('createAndAdd')}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Dialog>
  );
}

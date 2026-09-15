import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderOpen, Star, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn, formatFileSize } from '@/lib/utils';
import type { LibraryEntry } from '@/shared/library';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

/** Always offered as one-click toggles; any other tag is free-form. */
const QUICK_TAGS = ['Lu', 'À lire'];

function LibraryPage() {
  const { electron, chrome, node } = window.tankobon.versions;
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);

  const refresh = useCallback(() => {
    void window.tankobon.library.list().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFile = async () => {
    const filePath = await window.tankobon.comic.pickFile();
    if (filePath) {
      void navigate({ to: '/reader', search: { path: filePath } });
    }
  };

  const remove = async (id: string) => {
    await window.tankobon.library.remove(id);
    refresh();
  };

  const setRating = (id: string, rating: number) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, rating } : entry)));
    void window.tankobon.library.updateRating(id, rating);
  };

  const toggleTag = (entry: LibraryEntry, tag: string) => {
    const tags = entry.tags.includes(tag) ? entry.tags.filter((t) => t !== tag) : [...entry.tags, tag];
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, tags } : e)));
    void window.tankobon.library.updateTags(entry.id, tags);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
      <p className="text-muted-foreground">Gestionnaire et lecteur de BD numériques.</p>
      <div>
        <Button onClick={addFile}>
          <FolderOpen />
          Ajouter un fichier
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune BD dans la bibliothèque pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={entry.path}>
                    {entry.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Page {entry.currentPage + 1} / {entry.pageCount} · {entry.fileCount} fichiers ·{' '}
                    {formatFileSize(entry.fileSize)}
                  </p>
                </div>
                <StarRating rating={entry.rating} onChange={(rating) => setRating(entry.id, rating)} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate({ to: '/reader', search: { path: entry.path } })}
                >
                  Ouvrir
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(entry.id)}
                  title="Retirer de la bibliothèque"
                >
                  <Trash2 />
                </Button>
              </div>
              <TagEditor entry={entry} onToggle={(tag) => toggleTag(entry, tag)} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Electron {electron} · Chromium {chrome} · Node {node}
      </p>
    </div>
  );
}

function StarRating({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" title={rating > 0 ? `${rating} / 5` : 'Non noté'}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          // Clicking the star that already sets the current rating clears it.
          onClick={() => onChange(value === rating ? 0 : value)}
          aria-label={`Noter ${value} étoile${value > 1 ? 's' : ''}`}
          className="text-muted-foreground hover:text-yellow-500"
        >
          <Star className={cn('size-4', value <= rating && 'fill-yellow-400 text-yellow-500')} />
        </button>
      ))}
    </div>
  );
}

function TagEditor({ entry, onToggle }: { entry: LibraryEntry; onToggle: (tag: string) => void }) {
  const [newTag, setNewTag] = useState('');
  const customTags = entry.tags.filter((tag) => !QUICK_TAGS.includes(tag));

  const addCustomTag = () => {
    const tag = newTag.trim();
    if (tag && !entry.tags.includes(tag)) {
      onToggle(tag);
    }
    setNewTag('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_TAGS.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggle(tag)}
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs',
            entry.tags.includes(tag)
              ? 'border-primary bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {tag}
        </button>
      ))}
      {customTags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs text-primary"
        >
          {tag}
          <button type="button" onClick={() => onToggle(tag)} aria-label={`Retirer l'étiquette ${tag}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={newTag}
        onChange={(event) => setNewTag(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            addCustomTag();
          }
        }}
        placeholder="+ étiquette"
        className="w-24 rounded-full border border-dashed bg-transparent px-2 py-0.5 text-xs outline-none focus:border-solid focus:border-primary"
      />
    </div>
  );
}

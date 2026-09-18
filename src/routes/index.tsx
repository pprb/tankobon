import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderOpen, FolderTree, Search, Star, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  availableTags,
  EMPTY_FILTERS,
  filterEntries,
  hasActiveFilters,
  type LibraryFilters,
  type RatingFilter,
} from '@/lib/library-filter';
import { cn, formatFileSize } from '@/lib/utils';
import type { LibraryEntry, ScanProgress } from '@/shared/library';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

/** Always offered as one-click toggles; any other tag is free-form. */
const QUICK_TAGS = ['Lu', 'À lire'];

function LibraryPage() {
  const { electron, chrome, node } = window.tankobon.versions;
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS);
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const visible = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const tags = useMemo(() => availableTags(entries, QUICK_TAGS), [entries]);

  const refresh = useCallback(() => {
    void window.tankobon.library.list().then(setEntries);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribed for the whole page's life rather than around each scan: the main process starts
  // sending progress as soon as the directory is picked, which is before `addFolder()` resolves.
  useEffect(() => window.tankobon.library.onScanProgress(setScan), []);

  const addFolder = async () => {
    setScanStatus(null);
    const result = await window.tankobon.library.addFolder();
    setScan(null);
    if (result.status === 'cancelled') {
      return;
    }
    refresh();
    const parts = [`${result.added} BD ajoutée(s) depuis ${result.directory}`];
    if (result.skipped > 0) parts.push(`${result.skipped} déjà présente(s)`);
    if (result.failed > 0) parts.push(`${result.failed} illisible(s)`);
    setScanStatus(result.total === 0 ? `Aucune BD trouvée dans ${result.directory}` : parts.join(' · '));
  };

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
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={addFile} disabled={scan !== null}>
          <FolderOpen />
          Ajouter un fichier
        </Button>
        <Button variant="outline" onClick={addFolder} disabled={scan !== null}>
          <FolderTree />
          Ajouter un dossier…
        </Button>
      </div>

      {scan && <ScanProgressBar progress={scan} />}
      {scanStatus && <p className="text-sm text-muted-foreground">{scanStatus}</p>}

      {entries.length > 0 && (
        <LibraryToolbar
          filters={filters}
          onChange={setFilters}
          tags={tags}
          shown={visible.length}
          total={entries.length}
        />
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune BD dans la bibliothèque pour le moment.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune BD ne correspond à la recherche.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {visible.map((entry) => (
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

function ScanProgressBar({ progress }: { progress: ScanProgress }) {
  // The walk reports no total yet, so the bar stays empty until the first file is opened.
  const scanning = progress.phase === 'scanning';

  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{scanning ? 'Recherche des BD…' : `${progress.processed} / ${progress.total}`}</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={progress.currentFile}>
          {progress.currentFile}
        </span>
      </div>
      <Progress value={progress.processed} max={progress.total} label="Progression de l'analyse" />
    </div>
  );
}

function LibraryToolbar({
  filters,
  onChange,
  tags,
  shown,
  total,
}: {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  tags: string[];
  shown: number;
  total: number;
}) {
  const active = hasActiveFilters(filters);

  const toggleTag = (tag: string) =>
    onChange({
      ...filters,
      tags: filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag],
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            type="search"
            placeholder="Rechercher un album…"
            aria-label="Rechercher un album"
            className="h-9 w-full rounded-md border bg-background pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <RatingFilterPicker
          rating={filters.rating}
          onChange={(rating) => onChange({ ...filters, rating })}
        />

        {active && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
            <X />
            Réinitialiser
          </Button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => {
            const selected = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={selected}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <p className="text-xs text-muted-foreground">
          {shown} BD sur {total}
        </p>
      )}
    </div>
  );
}

/** Picks a *minimum* rating: clicking the 3rd star keeps everything rated 3 and above. */
function RatingFilterPicker({
  rating,
  onChange,
}: {
  rating: RatingFilter;
  onChange: (rating: RatingFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-1">
      <span className="text-xs text-muted-foreground">Note</span>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          // Clicking the star that already sets the current minimum clears the filter.
          onClick={() => onChange(value === rating ? 'all' : value)}
          aria-pressed={rating !== 'all' && value <= rating}
          title={`Au moins ${value} étoile${value > 1 ? 's' : ''}`}
          aria-label={`Au moins ${value} étoile${value > 1 ? 's' : ''}`}
          className="text-muted-foreground hover:text-yellow-500"
        >
          <Star className={cn('size-4', rating !== 'all' && value <= rating && 'fill-yellow-400 text-yellow-500')} />
        </button>
      ))}
    </div>
  );
}

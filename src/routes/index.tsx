import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FolderOpen, FolderTree, ListPlus, Pencil, ScanSearch, Search, Star, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddToListDialog } from '@/components/add-to-list-dialog';
import { BookCover } from '@/components/book-cover';
import { BookEditDialog } from '@/components/book-edit-dialog';
import { MetadataDialog } from '@/components/metadata-dialog';
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
import { creditRoleLabel } from '@/lib/metadata-review';
import { encodeDraggedEntry, LIBRARY_ENTRY_DRAG_TYPE, READ_TAG, tagLabel, TO_READ_TAG } from '@/lib/reading-list';
import { cn, formatFileSize, formatLanguage } from '@/lib/utils';
import { CREDIT_ROLES, type LibraryEntry, type ScanProgress } from '@/shared/library';
import { formatPersonName } from '@/shared/title-parsing';

export const Route = createFileRoute('/')({
  component: LibraryPage,
});

/** Always offered as one-click toggles; any other tag is free-form. */
const QUICK_TAGS = [READ_TAG, TO_READ_TAG];

function LibraryPage() {
  const { t } = useTranslation(['library', 'common']);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS);
  const [scan, setScan] = useState<ScanProgress | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [lookupEntry, setLookupEntry] = useState<LibraryEntry | null>(null);
  const [editEntry, setEditEntry] = useState<LibraryEntry | null>(null);
  const [listEntry, setListEntry] = useState<LibraryEntry | null>(null);
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
    const parts = [t('scanAdded', { count: result.added, directory: result.directory })];
    if (result.skipped > 0) parts.push(t('scanSkipped', { count: result.skipped }));
    if (result.failed > 0) parts.push(t('scanFailed', { count: result.failed }));
    setScanStatus(result.total === 0 ? t('scanNoneFound', { directory: result.directory }) : parts.join(' · '));
  };

  const addFile = async () => {
    const filePath = await window.tankobon.comic.pickFile();
    if (filePath) {
      void navigate({ to: '/reader', search: { path: filePath } });
    }
  };

  const remove = async (entry: LibraryEntry) => {
    if (!window.confirm(t('confirmRemove', { title: entry.title }))) return;
    await window.tankobon.library.remove(entry.id);
    refresh();
  };

  const setRating = (id: string, rating: number) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, rating } : entry)));
    void window.tankobon.library.updateRating(id, rating);
  };

  const replaceEntry = (updated: LibraryEntry) => {
    setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
  };

  const toggleTag = (entry: LibraryEntry, tag: string) => {
    const tags = entry.tags.includes(tag) ? entry.tags.filter((t) => t !== tag) : [...entry.tags, tag];
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, tags } : e)));
    void window.tankobon.library.updateTags(entry.id, tags);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('intro')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={addFile} disabled={scan !== null}>
          <FolderOpen />
          {t('addFile')}
        </Button>
        <Button variant="outline" onClick={addFolder} disabled={scan !== null}>
          <FolderTree />
          {t('addFolder')}
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
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noMatch')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {visible.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex items-center gap-3">
                {/* The cover and the text drag the book onto a reading list of the sidebar; the
                    rest of the row (stars, buttons, tag field) keeps its own mouse handling. */}
                <div
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(LIBRARY_ENTRY_DRAG_TYPE, encodeDraggedEntry(entry));
                    // 'move', like the app's other drags, so the OS shows the same pointer (not the
                    // copy one with a "+"), even though the book stays in the library.
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  className="flex min-w-0 flex-1 cursor-grab items-center gap-3 active:cursor-grabbing"
                  title={t('dragHint')}
                >
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/reader', search: { path: entry.path } })}
                    title={t('common:open')}
                    aria-label={t('openNamed', { title: entry.title })}
                    className="shrink-0 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <BookCover entryId={entry.id} title={entry.title} className="h-20 w-14" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" title={entry.path}>
                      {entry.title}
                    </p>
                    <EntryMetadata entry={entry} />
                    <p className="text-xs text-muted-foreground">
                      {[
                        t('common:pageOf', { page: entry.currentPage + 1, total: entry.pageCount }),
                        t('fileCount', { count: entry.fileCount }),
                        formatFileSize(entry.fileSize),
                      ].join(' · ')}
                    </p>
                  </div>
                </div>
                <StarRating rating={entry.rating} onChange={(rating) => setRating(entry.id, rating)} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditEntry(entry)}
                  title={t('editHint')}
                  aria-label={t('edit')}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setLookupEntry(entry)}
                  title={t('lookupHint')}
                  aria-label={t('lookup')}
                >
                  <ScanSearch />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setListEntry(entry)}
                  title={t('addToList')}
                  aria-label={t('addToList')}
                >
                  <ListPlus />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate({ to: '/reader', search: { path: entry.path } })}
                >
                  {t('common:open')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(entry)}
                  title={t('remove')}
                  aria-label={t('remove')}
                >
                  <Trash2 />
                </Button>
              </div>
              <TagEditor entry={entry} onToggle={(tag) => toggleTag(entry, tag)} />
            </li>
          ))}
        </ul>
      )}

      {lookupEntry && (
        <MetadataDialog entry={lookupEntry} onClose={() => setLookupEntry(null)} onApplied={replaceEntry} />
      )}
      {editEntry && <BookEditDialog entry={editEntry} onClose={() => setEditEntry(null)} onSaved={replaceEntry} />}
      {listEntry && <AddToListDialog entry={listEntry} onClose={() => setListEntry(null)} />}
    </div>
  );
}

/** Series, volume, date, language and credits found by a metadata lookup; nothing when there are none. */
function EntryMetadata({ entry }: { entry: LibraryEntry }) {
  const { t } = useTranslation(['library', 'common']);
  const series = [entry.series, entry.volume && t('volumeShort', { volume: entry.volume })].filter(Boolean).join(' · ');
  const details = [series, entry.releaseDate?.slice(0, 4), formatLanguage(entry.language)].filter(Boolean);
  const credits = CREDIT_ROLES.flatMap((role) => {
    const names = entry.credits.filter((credit) => credit.role === role).map(formatPersonName);
    return names.length > 0 ? [t('common:labelValue', { label: creditRoleLabel(role), value: names.join(', ') })] : [];
  });
  if (details.length === 0 && credits.length === 0) return null;

  return (
    <p className="truncate text-xs" title={credits.join('\n') || undefined}>
      {details.join(' · ')}
      {details.length > 0 && credits.length > 0 && ' — '}
      <span className="text-muted-foreground">{credits.join(' · ')}</span>
    </p>
  );
}

function StarRating({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) {
  const { t } = useTranslation('library');
  return (
    <div className="flex shrink-0 items-center gap-0.5" title={rating > 0 ? t('rating', { rating }) : t('notRated')}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          // Clicking the star that already sets the current rating clears it.
          onClick={() => onChange(value === rating ? 0 : value)}
          aria-label={t('rate', { count: value })}
          className="text-muted-foreground hover:text-yellow-500"
        >
          <Star className={cn('size-4', value <= rating && 'fill-yellow-400 text-yellow-500')} />
        </button>
      ))}
    </div>
  );
}

function TagEditor({ entry, onToggle }: { entry: LibraryEntry; onToggle: (tag: string) => void }) {
  const { t } = useTranslation('library');
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
          {tagLabel(tag)}
        </button>
      ))}
      {customTags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-xs text-primary"
        >
          {tag}
          <button type="button" onClick={() => onToggle(tag)} aria-label={t('removeTag', { tag })}>
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
        placeholder={t('newTag')}
        className="w-24 rounded-full border border-dashed bg-transparent px-2 py-0.5 text-xs outline-none focus:border-solid focus:border-primary"
      />
    </div>
  );
}

function ScanProgressBar({ progress }: { progress: ScanProgress }) {
  // The walk reports no total yet, so the bar stays empty until the first file is opened.
  const scanning = progress.phase === 'scanning';
  const { t } = useTranslation('library');

  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{scanning ? t('scanning') : `${progress.processed} / ${progress.total}`}</span>
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={progress.currentFile}>
          {progress.currentFile}
        </span>
      </div>
      <Progress value={progress.processed} max={progress.total} label={t('scanProgress')} />
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
  const { t } = useTranslation('library');
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
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
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
            {t('reset')}
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
                {tagLabel(tag)}
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <p className="text-xs text-muted-foreground">{t('shownOf', { shown, total })}</p>
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
  const { t } = useTranslation('library');
  return (
    <div className="flex items-center gap-1 rounded-md border px-2 py-1">
      <span className="text-xs text-muted-foreground">{t('ratingFilter')}</span>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          // Clicking the star that already sets the current minimum clears the filter.
          onClick={() => onChange(value === rating ? 'all' : value)}
          aria-pressed={rating !== 'all' && value <= rating}
          title={t('atLeast', { count: value })}
          aria-label={t('atLeast', { count: value })}
          className="text-muted-foreground hover:text-yellow-500"
        >
          <Star className={cn('size-4', rating !== 'all' && value <= rating && 'fill-yellow-400 text-yellow-500')} />
        </button>
      ))}
    </div>
  );
}

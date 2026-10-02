import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  buildReview,
  creditRoleLabel,
  isEmptyUpdate,
  type MetadataReview,
  reviewFieldLabel,
  reviewToUpdate,
} from '@/lib/metadata-review';
import { cn, formatLanguage } from '@/lib/utils';
import { CREDIT_ROLES, type CreditRole, type LibraryEntry } from '@/shared/library';
import {
  isBedethequeAlbumUrl,
  METADATA_SOURCE_LABELS,
  type MetadataCandidate,
  type MetadataQuery,
} from '@/shared/metadata';
import { formatPersonName, guessQueryFromTitle } from '@/shared/title-parsing';

type Step =
  | { kind: 'searching' }
  | { kind: 'results'; candidates: MetadataCandidate[]; errors: string[] }
  | { kind: 'error'; message: string }
  | { kind: 'review'; candidates: MetadataCandidate[]; review: MetadataReview };

const INPUT_CLASS =
  'h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** What to search for first: the stored series and volume if any, else a guess from the title. */
function initialQuery(entry: LibraryEntry): MetadataQuery {
  return entry.series ? { text: entry.series, volume: entry.volume } : guessQueryFromTitle(entry.title);
}

/**
 * Looks a library entry up in the configured public APIs, lets the user pick the right book among
 * the results, then accept, edit or refuse each proposed change before writing it. A Bédéthèque
 * album link typed in the search field skips the results and goes straight to the review.
 */
export function MetadataDialog({
  entry,
  onClose,
  onApplied,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  onApplied: (entry: LibraryEntry) => void;
}) {
  const { t } = useTranslation(['metadata', 'common']);
  const [query, setQuery] = useState<MetadataQuery>(() => initialQuery(entry));
  const [step, setStep] = useState<Step>({ kind: 'searching' });
  const [applying, setApplying] = useState(false);

  // Only the latest search may update the dialog: an earlier, slower one would show stale results.
  const latestSearch = useRef(0);

  const runSearch = useCallback(
    async (q: MetadataQuery) => {
      const id = ++latestSearch.current;
      if (isBedethequeAlbumUrl(q.text)) {
        const result = await window.tankobon.metadata.fromPage(q.text.trim());
        if (id !== latestSearch.current) return;
        setStep(
          result.status === 'ok'
            ? { kind: 'review', candidates: [result.candidate], review: buildReview(entry, result.candidate) }
            : { kind: 'error', message: result.message },
        );
        return;
      }
      const result = await window.tankobon.metadata.search(q);
      if (id !== latestSearch.current) return;
      setStep(
        result.status === 'ok'
          ? { kind: 'results', candidates: result.candidates, errors: result.errors }
          : { kind: 'error', message: result.message },
      );
    },
    [entry],
  );

  const search = (q: MetadataQuery) => {
    setStep({ kind: 'searching' });
    void runSearch(q);
  };

  // Searches right away with the guessed query: most of the time it's good enough.
  useEffect(() => {
    void runSearch(initialQuery(entry));
    return () => {
      // Invalidates the search in flight, so it doesn't land after the dialog closed.
      latestSearch.current += 1;
    };
  }, [entry, runSearch]);

  const apply = async (review: MetadataReview) => {
    const update = reviewToUpdate(entry, review);
    if (isEmptyUpdate(update)) {
      onClose();
      return;
    }
    setApplying(true);
    const updated = await window.tankobon.library.updateMetadata(entry.id, update);
    setApplying(false);
    if (updated) onApplied(updated);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('title')}
      description={entry.path}
      className="max-w-3xl"
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
      >
        <input
          aria-label={t('queryLabel')}
          placeholder={t('queryPlaceholder')}
          className={cn(INPUT_CLASS, 'min-w-48 flex-1')}
          value={query.text}
          onChange={(event) => setQuery({ ...query, text: event.target.value })}
        />
        <input
          aria-label={t('volumeLabel')}
          placeholder={t('volumePlaceholder')}
          className={cn(INPUT_CLASS, 'w-24')}
          value={query.volume ?? ''}
          onChange={(event) => setQuery({ ...query, volume: event.target.value || null })}
        />
        <Button type="submit" size="sm" variant="outline" disabled={step.kind === 'searching'}>
          <Search />
          {isBedethequeAlbumUrl(query.text) ? t('readPage') : t('search')}
        </Button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step.kind === 'searching' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {isBedethequeAlbumUrl(query.text) ? t('readingPage') : t('searching')}
          </p>
        )}
        {step.kind === 'error' && <p className="text-sm whitespace-pre-line text-destructive">{step.message}</p>}
        {step.kind === 'results' && (
          <CandidateList
            candidates={step.candidates}
            errors={step.errors}
            onPick={(candidate) =>
              setStep({ kind: 'review', candidates: step.candidates, review: buildReview(entry, candidate) })
            }
          />
        )}
        {step.kind === 'review' && (
          <ReviewForm
            review={step.review}
            onChange={(review) => setStep({ ...step, review })}
          />
        )}
      </div>

      {step.kind === 'review' && (
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep({ kind: 'results', candidates: step.candidates, errors: [] })}
          >
            <ArrowLeft />
            {t('otherResults')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common:cancel')}
            </Button>
            <Button size="sm" onClick={() => void apply(step.review)} disabled={applying}>
              {t('apply')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function candidateHeading(candidate: MetadataCandidate, t: TFunction<'metadata'>): string {
  const series = [candidate.series, candidate.volume && `#${candidate.volume}`].filter(Boolean).join(' ');
  return [series, candidate.title].filter(Boolean).join(' — ') || t('untitled');
}

function CandidateList({
  candidates,
  errors,
  onPick,
}: {
  candidates: MetadataCandidate[];
  errors: string[];
  onPick: (candidate: MetadataCandidate) => void;
}) {
  const { t } = useTranslation('metadata');
  return (
    <div className="flex flex-col gap-2">
      {errors.map((error) => (
        <p key={error} className="text-sm text-destructive">
          {error}
        </p>
      ))}
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {candidates.map((candidate) => (
            <li key={`${candidate.source}-${candidate.sourceId}`}>
              <button
                type="button"
                onClick={() => onPick(candidate)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
              >
                {candidate.coverUrl ? (
                  <img src={candidate.coverUrl} alt="" className="h-16 w-11 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-16 w-11 shrink-0 rounded-sm bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{candidateHeading(candidate, t)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[candidate.releaseDate, formatLanguage(candidate.language), METADATA_SOURCE_LABELS[candidate.source]]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {candidate.credits.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[...new Set(candidate.credits.map(formatPersonName))].join(', ')}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewForm({ review, onChange }: { review: MetadataReview; onChange: (review: MetadataReview) => void }) {
  const { t } = useTranslation('metadata');
  const setField = (index: number, patch: Partial<MetadataReview['fields'][number]>) =>
    onChange({ ...review, fields: review.fields.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const setCredit = (index: number, patch: Partial<MetadataReview['credits'][number]>) =>
    onChange({ ...review, credits: review.credits.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  return (
    <div className="flex flex-col gap-4">
      {review.fields.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-8 pb-1 font-normal">
                <span className="sr-only">{t('accept')}</span>
              </th>
              <th className="pb-1 font-normal">{t('field')}</th>
              <th className="pb-1 font-normal">{t('current')}</th>
              <th className="pb-1 font-normal">{t('proposed')}</th>
            </tr>
          </thead>
          <tbody>
            {review.fields.map((row, index) => (
              <tr key={row.field} className={cn(!row.accepted && 'text-muted-foreground')}>
                <td className="py-1">
                  <input
                    type="checkbox"
                    aria-label={t('acceptField', { field: reviewFieldLabel(row.field) })}
                    checked={row.accepted}
                    onChange={(event) => setField(index, { accepted: event.target.checked })}
                  />
                </td>
                <td className="py-1 pr-2 whitespace-nowrap">{reviewFieldLabel(row.field)}</td>
                <td className="max-w-48 truncate py-1 pr-2" title={row.current ?? undefined}>
                  {row.current ?? '—'}
                </td>
                <td className="py-1">
                  <input
                    aria-label={t('proposedValue', { field: reviewFieldLabel(row.field) })}
                    className={cn(INPUT_CLASS, 'w-full')}
                    value={row.proposed}
                    // Editing a value means the user wants it.
                    onChange={(event) => setField(index, { proposed: event.target.value, accepted: true })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{t('authors')}</h3>
        {review.credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noAuthors')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {review.credits.map((credit, index) => (
              <li key={credit.key} className={cn('flex items-center gap-2', !credit.accepted && 'opacity-60')}>
                <input
                  type="checkbox"
                  aria-label={t(credit.origin === 'current' ? 'keepAuthor' : 'addAuthor', { name: formatPersonName(credit) })}
                  checked={credit.accepted}
                  onChange={(event) => setCredit(index, { accepted: event.target.checked })}
                />
                <input
                  aria-label={t('firstName')}
                  placeholder={t('firstName')}
                  className={cn(INPUT_CLASS, 'w-36')}
                  value={credit.firstName}
                  onChange={(event) => setCredit(index, { firstName: event.target.value })}
                />
                <input
                  aria-label={t('lastName')}
                  placeholder={t('lastName')}
                  className={cn(INPUT_CLASS, 'w-40')}
                  value={credit.lastName}
                  onChange={(event) => setCredit(index, { lastName: event.target.value })}
                />
                <select
                  aria-label={t('role')}
                  className={cn(INPUT_CLASS, 'w-32')}
                  value={credit.role}
                  onChange={(event) => setCredit(index, { role: event.target.value as CreditRole })}
                >
                  {CREDIT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {creditRoleLabel(role)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  {credit.origin === 'current' ? t('currentTag') : t('proposedTag')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

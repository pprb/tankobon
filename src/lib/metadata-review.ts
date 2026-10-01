/**
 * The review step of a metadata lookup: what the confirmation dialog shows for a chosen
 * candidate, and the update its accepted rows produce (pure, no DOM).
 * @module
 */
import type { CreditInput, CreditRole, LibraryEntry, MetadataUpdate } from '@/shared/library';
import type { MetadataCandidate } from '@/shared/metadata';

/** The library fields a lookup can fill, besides the credits. */
export type ReviewField = 'title' | 'series' | 'volume' | 'releaseDate' | 'language';

/** French labels of the reviewed fields, in display order. */
export const REVIEW_FIELD_LABELS: Record<ReviewField, string> = {
  title: 'Titre',
  series: 'Série',
  volume: 'Tome / n°',
  releaseDate: 'Date de sortie',
  language: 'Langue',
};

/** French labels of the credit roles. */
export const CREDIT_ROLE_LABELS: Record<CreditRole, string> = {
  writer: 'Scénario',
  artist: 'Dessin',
  colorist: 'Couleurs',
  inker: 'Encrage',
  letterer: 'Lettrage',
  cover: 'Couverture',
  author: 'Auteur',
};

/** One field row of the dialog: the current value, the (editable) proposed one, and the user's choice. */
export interface FieldReview {
  field: ReviewField;
  current: string | null;
  proposed: string;
  accepted: boolean;
}

/** One credit row of the dialog, either already on the book or proposed by the candidate. */
export interface CreditReview extends CreditInput {
  /** Stable key for React lists. */
  key: string;
  origin: 'current' | 'proposed';
  /** For a current credit: keep it. For a proposed one: add it. */
  accepted: boolean;
}

/** Everything the confirmation dialog edits. */
export interface MetadataReview {
  fields: FieldReview[];
  credits: CreditReview[];
}

function currentValue(entry: LibraryEntry, field: ReviewField): string | null {
  return field === 'title' ? entry.title : entry[field];
}

function creditKey(credit: CreditInput): string {
  return [credit.firstName, credit.lastName, credit.role].map((part) => part.trim().toLocaleLowerCase()).join('|');
}

/**
 * The rows to review for a candidate. Only the fields the candidate knows are listed, pre-accepted
 * when they would change something. Current credits are listed first (kept by default), then the
 * candidate's ones that aren't on the book already (added by default).
 */
export function buildReview(entry: LibraryEntry, candidate: MetadataCandidate): MetadataReview {
  const fields = (Object.keys(REVIEW_FIELD_LABELS) as ReviewField[]).flatMap((field): FieldReview[] => {
    const proposed = candidate[field]?.trim();
    if (!proposed) return [];
    const current = currentValue(entry, field);
    return [{ field, current, proposed, accepted: proposed !== current }];
  });

  const known = new Set(entry.credits.map(creditKey));
  const credits: CreditReview[] = [
    ...entry.credits.map((credit, index) => ({
      key: `current-${index}`,
      firstName: credit.firstName,
      lastName: credit.lastName,
      role: credit.role,
      origin: 'current' as const,
      accepted: true,
    })),
    ...candidate.credits
      .filter((credit) => !known.has(creditKey(credit)))
      .map((credit, index) => ({ ...credit, key: `proposed-${index}`, origin: 'proposed' as const, accepted: true })),
  ];
  return { fields, credits };
}

/**
 * The update the accepted rows produce. An emptied field is cleared (except the title, which is
 * then left alone); the credits become exactly the accepted rows, in order, so unticking a current
 * credit removes it from the book. Credits are left out when nothing about them changed.
 */
export function reviewToUpdate(entry: LibraryEntry, review: MetadataReview): MetadataUpdate {
  const update: MetadataUpdate = {};
  for (const row of review.fields) {
    if (!row.accepted) continue;
    const value = row.proposed.trim();
    if (row.field === 'title') {
      if (value) update.title = value;
    } else {
      update[row.field] = value || null;
    }
  }

  const credits = review.credits
    .filter((credit) => credit.accepted && credit.lastName.trim() !== '')
    .map(({ firstName, lastName, role }) => ({ firstName: firstName.trim(), lastName: lastName.trim(), role }));
  const unchanged =
    credits.length === entry.credits.length && credits.every((credit, i) => creditKey(credit) === creditKey(entry.credits[i]));
  if (!unchanged) {
    update.credits = credits;
  }
  return update;
}

/** Whether applying `update` would change anything. */
export function isEmptyUpdate(update: MetadataUpdate): boolean {
  return Object.keys(update).length === 0;
}

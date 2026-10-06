import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { AchievementId } from '@/shared/achievements';

/** Stars under the badge for the tiers of one achievement (1 for the first, 3 for the last). */
const TIERS: Partial<Record<AchievementId, 1 | 2 | 3>> = {
  finished10: 1,
  finished50: 2,
  finished200: 3,
  librarian: 1,
  archivist: 2,
  grandArchivist: 3,
  critic10: 1,
  critic50: 2,
  scholar1: 1,
  scholar10: 2,
};

const INK = 'var(--color-foreground)';

/** Drawn with a thick ink outline and one flat accent fill, like a manga panel; `a` is the accent. */
function glyph(id: AchievementId, a: string): ReactNode {
  const ink = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
  switch (id) {
    case 'firstBook':
    case 'finished10':
    case 'finished50':
    case 'finished200':
      // An open book.
      return (
        <>
          <path d="M32 20c-5-4-12-5-19-4v26c7-1 14 0 19 4 5-4 12-5 19-4V16c-7-1-14 0-19 4Z" fill={a} {...ink} />
          <path d="M32 20v26" fill="none" {...ink} />
        </>
      );
    case 'nightOwl':
      // A crescent moon.
      return (
        <>
          <path d="M40 14a18 18 0 1 0 10 28A15 15 0 0 1 40 14Z" fill={a} {...ink} />
          <path d="M16 18l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="none" {...ink} strokeWidth={2.5} />
        </>
      );
    case 'earlyBird':
      // A rising sun with speed lines.
      return (
        <>
          <path d="M16 42a16 16 0 0 1 32 0Z" fill={a} {...ink} />
          <path d="M10 46h44M32 14v6M16 22l4 4M48 22l-4 4" fill="none" {...ink} />
        </>
      );
    case 'librarian':
    case 'archivist':
    case 'grandArchivist':
      // Books standing on a shelf.
      return (
        <>
          <path d="M14 16h9v28h-9ZM25 12h9v32h-9Z" fill={a} {...ink} />
          <path d="M36 18l8-3 7 26-8 3Z" fill="none" {...ink} />
          <path d="M10 46h44" fill="none" {...ink} />
        </>
      );
    case 'formats':
      // Three overlapping sheets.
      return (
        <>
          <path d="M12 20h22v28H12Z" fill="none" {...ink} />
          <path d="M20 14h22v28H20Z" fill="none" {...ink} />
          <path d="M28 20h22v28H28Z" fill={a} {...ink} />
        </>
      );
    case 'sentinel':
      // An eye keeping watch.
      return (
        <>
          <path d="M8 32c6-11 14-16 24-16s18 5 24 16c-6 11-14 16-24 16S14 43 8 32Z" fill="none" {...ink} />
          <circle cx="32" cy="32" r="8" fill={a} {...ink} />
        </>
      );
    case 'listMaker':
    case 'listMaster':
      // A scroll of lines, with a star for the master.
      return (
        <>
          <path d="M16 12h32v40H16Z" fill={a} {...ink} />
          <path d="M23 22h18M23 30h18M23 38h10" fill="none" {...ink} />
          {id === 'listMaster' && <path d="M46 40l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z" fill="var(--color-background)" {...ink} strokeWidth={2.5} />}
        </>
      );
    case 'critic10':
    case 'critic50':
      // A star.
      return <path d="M32 10l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 27l16-2Z" fill={a} {...ink} />;
    case 'tagger':
      // A tag.
      return (
        <>
          <path d="M10 32V12h20l24 24-20 20Z" fill={a} {...ink} />
          <circle cx="21" cy="23" r="3.5" fill="var(--color-background)" {...ink} strokeWidth={2.5} />
        </>
      );
    case 'scholar1':
    case 'scholar10':
      // A magnifying glass.
      return (
        <>
          <circle cx="28" cy="28" r="14" fill={a} {...ink} />
          <path d="M38 38l14 14" fill="none" {...ink} strokeWidth={5} />
        </>
      );
    case 'rightToLeft':
      // A page and an arrow pointing back.
      return (
        <>
          <path d="M26 14h24v36H26Z" fill={a} {...ink} />
          <path d="M8 32h14M14 25l-7 7 7 7" fill="none" {...ink} />
        </>
      );
    case 'polyglot':
      // Two speech bubbles.
      return (
        <>
          <path d="M8 14h28v18H20l-8 7v-7H8Z" fill={a} {...ink} />
          <path d="M28 26h28v18h-4v7l-8-7H28Z" fill="none" {...ink} />
        </>
      );
  }
}

/**
 * The badge of an achievement: a manga-style drawing in the app's accent colour, greyed out until
 * the achievement is earned. Decorative (its name is shown next to it).
 */
export function AchievementIcon({ id, unlocked, className }: { id: AchievementId; unlocked: boolean; className?: string }) {
  const accent = unlocked ? 'var(--color-achievement)' : 'var(--color-muted)';
  const tier = TIERS[id];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-14 shrink-0', !unlocked && 'opacity-60 grayscale', className)}>
      <g>{glyph(id, accent)}</g>
      {tier && (
        <g fill={unlocked ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'}>
          {Array.from({ length: tier }, (_, i) => (
            <path key={i} transform={`translate(${32 + (i - (tier - 1) / 2) * 11} 58)`} d="M0-4l1.2 2.8 3 .3-2.3 2 .7 3L0 2.5-2.6 4.1l.7-3-2.3-2 3-.3Z" />
          ))}
        </g>
      )}
    </svg>
  );
}

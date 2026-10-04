import { useTranslation } from 'react-i18next';

import { formatRemainingTime } from '@/hooks/use-reading-pace';

/** Progress % and estimated remaining reading time, shared by both reader modes. */
export function ReadingProgress({ percent, remainingMinutes }: { percent: number; remainingMinutes: number | null }) {
  const { t } = useTranslation('reader');
  return (
    <span
      className="tabular-nums text-white/60"
      title={
        remainingMinutes !== null
          ? t('remainingTime', { time: formatRemainingTime(remainingMinutes) })
          : t('bookProgress')
      }
    >
      {t('percent', { percent: Math.round(percent) })}{remainingMinutes !== null && <> · ~{formatRemainingTime(remainingMinutes)}</>}
    </span>
  );
}

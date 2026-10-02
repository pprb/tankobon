import { useTranslation } from 'react-i18next';

import { Progress } from '@/components/ui/progress';
import type { ListProgress } from '@/lib/reading-list';

/** A reading list's progress: bar plus "3 / 5 lus · 60 %". */
export function ReadingListProgress({ progress }: { progress: ListProgress }) {
  const { t } = useTranslation('lists');
  return (
    <div className="flex items-center gap-3">
      <Progress
        value={progress.finished}
        max={progress.total}
        label={t('progressLabel')}
        className="flex-1"
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {t('progress', { count: progress.finished, total: progress.total, percent: Math.round(progress.percent) })}
      </span>
    </div>
  );
}

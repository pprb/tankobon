import { Progress } from '@/components/ui/progress';
import type { ListProgress } from '@/lib/reading-list';

/** A reading list's progress: bar plus "3 / 5 lus · 60 %". */
export function ReadingListProgress({ progress }: { progress: ListProgress }) {
  return (
    <div className="flex items-center gap-3">
      <Progress
        value={progress.finished}
        max={progress.total}
        label="Avancement de la liste"
        className="flex-1"
      />
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {progress.finished} / {progress.total} lu{progress.finished > 1 ? 's' : ''} · {Math.round(progress.percent)} %
      </span>
    </div>
  );
}

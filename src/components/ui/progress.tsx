import { cn } from '@/lib/utils';

/**
 * A determinate progress bar. `value`/`max` are clamped so a still-unknown total (max 0) renders
 * as an empty bar rather than `NaN`.
 */
export function Progress({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className?: string;
  label?: string;
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-150"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

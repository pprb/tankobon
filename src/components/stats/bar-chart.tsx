import { useTranslation } from 'react-i18next';

/** One bar: its label under the axis, its value, and the texts shown for it. */
export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
  /** Shown above the bar and in its tooltip, e.g. "3 books" or "2 h 10 min". */
  valueLabel: string;
}

/** Height of the bars' area; the tallest bar fills it. */
const PLOT_HEIGHT = 120;

/**
 * A bar chart drawn in SVG, one bar per period. The bars are scaled to the tallest one; a period
 * with nothing keeps its slot so the time axis has no gaps. `ariaLabel` describes the chart as a
 * whole, each bar has a tooltip with its value.
 */
export function BarChart({ data, ariaLabel }: { data: BarChartDatum[]; ariaLabel: string }) {
  const { t } = useTranslation('stats');
  const max = Math.max(...data.map((datum) => datum.value), 0);
  if (max === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{t('charts.empty')}</p>;
  }

  const slot = 48;
  const width = data.length * slot;
  const height = PLOT_HEIGHT + 40;
  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[480px]">
        {data.map((datum, index) => {
          const barHeight = (datum.value / max) * PLOT_HEIGHT;
          const x = index * slot;
          return (
            <g key={datum.key}>
              <title>{`${datum.label}: ${datum.valueLabel}`}</title>
              {datum.value > 0 && (
                <>
                  <rect
                    x={x + 8}
                    y={20 + PLOT_HEIGHT - barHeight}
                    width={slot - 16}
                    height={barHeight}
                    rx={3}
                    className="fill-primary"
                  />
                  <text
                    x={x + slot / 2}
                    y={14 + PLOT_HEIGHT - barHeight}
                    textAnchor="middle"
                    className="fill-foreground text-[9px]"
                  >
                    {datum.valueLabel}
                  </text>
                </>
              )}
              <text x={x + slot / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {datum.label}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={width} y1={20 + PLOT_HEIGHT} y2={20 + PLOT_HEIGHT} className="stroke-border" />
      </svg>
    </div>
  );
}

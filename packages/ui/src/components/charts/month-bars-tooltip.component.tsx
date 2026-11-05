import { formatChartMoney } from '#/components/charts/format-chart-money.util.ts';
import type { MonthBar } from '#/components/charts/month-bars-chart.type.ts';

type MonthBarsTooltipCardProps = {
  bar: MonthBar;
  valueLabel: string;
  hidden: boolean;
};

/** The dark tip of the monthly bars: the month, what the bar measures with its value, and the detail. */
export function MonthBarsTooltipCard({ bar, valueLabel, hidden }: MonthBarsTooltipCardProps) {
  return (
    <div className="flex flex-col gap-s4 rounded-input bg-fg-primary px-s12 py-s8 text-meta whitespace-nowrap text-page">
      <span className="font-emphasis capitalize">{bar.fullLabel}</span>
      <span className="flex justify-between gap-s16 tabular-nums">
        {valueLabel}
        <span>{formatChartMoney(bar.cents, hidden)}</span>
      </span>
      {bar.detail ? <span className="opacity-80">{bar.detail}</span> : null}
    </div>
  );
}

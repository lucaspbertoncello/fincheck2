import { formatChartMoney } from '#/components/charts/format-chart-money.util.ts';
import type { MonthSpendRow } from '#/components/charts/month-spend-series.util.ts';

type MonthSpendTooltipCardProps = {
  row: MonthSpendRow;
  currentLabel: string;
  previousLabel: string;
  hidden: boolean;
};

/** The dark tip of the "Gasto do mês" chart: the day and both values, named in text. */
export function MonthSpendTooltipCard({
  row,
  currentLabel,
  previousLabel,
  hidden,
}: MonthSpendTooltipCardProps) {
  return (
    <div className="flex flex-col gap-s4 rounded-input bg-fg-primary px-s12 py-s8 text-meta text-page">
      <span className="font-emphasis">Dia {row.day}</span>
      {row.current === null ? null : (
        <span className="flex justify-between gap-s16 tabular-nums">
          {currentLabel}
          <span>{formatChartMoney(row.current, hidden)}</span>
        </span>
      )}
      <span className="flex justify-between gap-s16 tabular-nums">
        {previousLabel}
        <span>{formatChartMoney(row.previous, hidden)}</span>
      </span>
    </div>
  );
}

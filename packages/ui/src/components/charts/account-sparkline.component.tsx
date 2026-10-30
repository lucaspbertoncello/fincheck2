import { Area, AreaChart, YAxis } from 'recharts';

import type { ChartPoint } from '#/components/charts/chart-point.type.ts';
import { formatChartMoneyForReader } from '#/components/charts/format-chart-money.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';

const STROKE = 'var(--color-accent-default)';

type AccountSparklineProps = {
  /** Balance per day, in integer cents. */
  points: readonly ChartPoint[];
  /** What the curve is, for screen readers ("Saldo de Nubank nos últimos 30 dias"). */
  label: string;
  /** Height in px (components.md 12.3: 48). */
  height?: number;
};

/** Account balance curve: a bare 2 px accent line, no axes, no tooltip (components.md 12.3). */
export function AccountSparkline({ points, label, height = 48 }: AccountSparklineProps) {
  const hidden = useMoneyHidden();
  const sorted = [...points].sort((a, b) => a.day - b.day);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const summary =
    first && last
      ? `${label}: de ${formatChartMoneyForReader(first.cents, hidden)} para ${formatChartMoneyForReader(last.cents, hidden)}`
      : `${label}: sem dados`;

  return (
    <div role="img" aria-label={summary} style={{ height }} className="w-full">
      {sorted.length > 1 ? (
        <AreaChart
          responsive
          width="100%"
          height={height}
          data={sorted}
          accessibilityLayer={false}
          margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
        >
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            dataKey="cents"
            type="monotone"
            stroke={STROKE}
            strokeWidth={2}
            fill="none"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : null}
    </div>
  );
}

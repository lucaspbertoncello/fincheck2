import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartDataTable } from '#/components/charts/chart-data-table.component.tsx';
import type { ChartPoint } from '#/components/charts/chart-point.type.ts';
import { formatChartMoneyForReader } from '#/components/charts/format-chart-money.util.ts';
import {
  formatAxisCents,
  maxOfRows,
  monthSpendXTicks,
  niceYAxis,
} from '#/components/charts/month-spend-axis.util.ts';
import {
  buildMonthSpendRows,
  type MonthSpendRow,
} from '#/components/charts/month-spend-series.util.ts';
import { MonthSpendTooltipCard } from '#/components/charts/month-spend-tooltip.component.tsx';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-secondary)' } as const;
const CURRENT_STROKE = 'var(--color-accent-default)';
const GHOST_STROKE = 'var(--color-chart-ghost)';
const SURFACE = 'var(--color-bg-page)';
const GRADIENT_ID = 'month-spend-area';

type MonthSpendChartProps = {
  title?: string;
  /** "Outubro". */
  currentLabel: string;
  /** "Setembro". */
  previousLabel: string;
  /** Cumulative spend per day of the current month, up to today. */
  current: readonly ChartPoint[];
  /** Cumulative spend per day of the previous month. */
  previous: readonly ChartPoint[];
  /** Day of the month of today; the current line stops here and the marker sits on it. */
  today: number;
  daysInMonth: number;
  /** Height of the plot in px. */
  height?: number;
};

function LegendItem({ label, ghost = false }: { label: string; ghost?: boolean }) {
  return (
    <span className="inline-flex items-center gap-s8 text-meta text-fg-secondary lg:text-label">
      <span
        aria-hidden="true"
        className="h-0.5 w-4 rounded-capsule"
        style={{ background: ghost ? GHOST_STROKE : CURRENT_STROKE }}
      />
      {label}
    </span>
  );
}

/**
 * "Gasto do mês": cumulative spend of the current month against the previous one, with a marker on
 * today (components.md 12.1). Presentation only: it receives ready points (day, cents). The
 * current month is a solid accent line, the previous a grey one, and both are named in the legend,
 * so color is never the only difference. The plot is hidden from assistive tech; a table says the
 * same thing.
 */
export function MonthSpendChart({
  title = 'Gasto do mês',
  currentLabel,
  previousLabel,
  current,
  previous,
  today,
  daysInMonth,
  height = 240,
}: MonthSpendChartProps) {
  const hidden = useMoneyHidden();
  const isEmpty = current.length === 0;
  const builtRows = buildMonthSpendRows({ current, previous, today, daysInMonth });
  // Nothing spent yet: no current line (a flat zero would read as a stray dotted mark).
  const rows = isEmpty ? builtRows.map((row) => ({ ...row, current: null })) : builtRows;
  const axis = niceYAxis(maxOfRows(rows));
  const todayValue = rows.find((row) => row.day === today)?.current ?? null;

  return (
    <section aria-label={title} className="flex flex-col gap-s16">
      <div className="flex flex-wrap items-center justify-between gap-x-s16 gap-y-s8">
        <h2 className="font-title text-section font-heading text-fg-primary">{title}</h2>
        <div className="flex items-center gap-s16">
          <LegendItem label={currentLabel} />
          <LegendItem label={previousLabel} ghost />
        </div>
      </div>

      <div aria-hidden="true" className="relative font-body">
        {isEmpty ? (
          <p className="pointer-events-none absolute top-s16 left-s16 z-(--z-raised) text-label text-fg-secondary">
            Sem gasto em {currentLabel} ainda
          </p>
        ) : null}
        <ComposedChart
          responsive
          width="100%"
          height={height}
          data={rows}
          accessibilityLayer={false}
          margin={{ top: 8, right: 0, bottom: 0, left: 12 }}
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: CURRENT_STROKE, stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: CURRENT_STROKE, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <YAxis
            orientation="right"
            ticks={axis.ticks}
            domain={[0, axis.top]}
            interval={0}
            width={48}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) => (hidden ? '••••' : formatAxisCents(value))}
          />
          <XAxis
            dataKey="day"
            type="number"
            domain={[1, daysInMonth]}
            ticks={monthSpendXTicks(daysInMonth)}
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
          />
          <Line
            dataKey="previous"
            stroke={GHOST_STROKE}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="current"
            stroke={CURRENT_STROKE}
            strokeWidth={2}
            fill={`url(#${GRADIENT_ID})`}
            dot={false}
            activeDot={{ r: 4, fill: CURRENT_STROKE, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {isEmpty ? null : (
            <ReferenceLine
              x={today}
              stroke="var(--color-text-secondary)"
              strokeDasharray="2 3"
              strokeWidth={1}
            />
          )}
          {todayValue === null ? null : (
            <ReferenceDot
              x={today}
              y={todayValue}
              r={4}
              fill={CURRENT_STROKE}
              stroke={SURFACE}
              strokeWidth={2}
            />
          )}
          <Tooltip
            cursor={{ stroke: 'var(--color-chart-grid)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as MonthSpendRow | undefined;
              return active && row ? (
                <MonthSpendTooltipCard
                  row={row}
                  currentLabel={currentLabel}
                  previousLabel={previousLabel}
                  hidden={hidden}
                />
              ) : null;
            }}
          />
        </ComposedChart>
      </div>

      <ChartDataTable
        caption={`${title}: gasto acumulado por dia, ${currentLabel} contra ${previousLabel}`}
        columns={['Dia', currentLabel, previousLabel]}
        rows={rows.map((row) => [
          String(row.day),
          row.current === null ? 'sem dado' : formatChartMoneyForReader(row.current, hidden),
          formatChartMoneyForReader(row.previous, hidden),
        ])}
      />
    </section>
  );
}

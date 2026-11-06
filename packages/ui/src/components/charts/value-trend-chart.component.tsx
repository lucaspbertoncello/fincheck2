import { CartesianGrid, ComposedChart, Line, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartDataTable } from '#/components/charts/chart-data-table.component.tsx';
import { niceValueRange } from '#/components/charts/nice-value-range.util.ts';
import type { ValueTrendPoint } from '#/components/charts/value-trend-point.type.ts';
import { ValueTrendTooltipCard } from '#/components/charts/value-trend-tooltip.component.tsx';
import { valueTrendXTicks } from '#/components/charts/value-trend-x-ticks.util.ts';

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-secondary)' } as const;
const LINE_STROKE = 'var(--color-accent-default)';
const GRID_STROKE = 'var(--color-chart-grid)';
const SURFACE = 'var(--color-bg-page)';

type ValueTrendChartProps = {
  /** Names the chart for assistive tech and its table ("Tamanho do banco a cada backup"). */
  title: string;
  /** What the line measures, said in the tip and the table ("Tamanho"). */
  valueLabel: string;
  /** The moments, oldest first. */
  points: readonly ValueTrendPoint[];
  /** The value as text, for the tip and the table ("2,5 MB"). */
  formatValue: (value: number) => string;
  /** The value as a short axis label ("2,5 MB"). */
  formatAxisValue: (value: number) => string;
  /** Shown over the plot when there is nothing to draw yet. */
  emptyMessage?: string;
  /** Height of the plot in px. */
  height?: number;
};

type TickProps = { x?: number | string; y?: number | string; payload?: { value: string } };

/**
 * One value over time (components.md 12.5, Polimento 13): a single accent line, the last point
 * marked, round ticks on the right and about five labels under the axis. The axis starts at the
 * lowest round tick, not at zero, so a slow growth stays readable. The plot is hidden from assistive
 * tech; a table says the same. Presentation only: it receives ready points and the two formatters.
 */
export function ValueTrendChart({
  title,
  valueLabel,
  points,
  formatValue,
  formatAxisValue,
  emptyMessage,
  height = 220,
}: ValueTrendChartProps) {
  const isEmpty = points.length === 0;
  const values = points.map((point) => point.value);
  const range = isEmpty
    ? niceValueRange(0, 1)
    : niceValueRange(Math.min(...values), Math.max(...values));
  const last = points.at(-1);

  function renderTick({ x = 0, y = 0, payload }: TickProps) {
    const point = points.find((item) => item.key === payload?.value);

    return (
      <text
        x={Number(x)}
        y={Number(y) + 12}
        textAnchor="middle"
        fontSize={12}
        fill="var(--color-text-secondary)"
      >
        {point?.label}
      </text>
    );
  }

  return (
    <section aria-label={title} className="flex flex-col gap-s8">
      <div aria-hidden="true" className="relative font-body">
        {isEmpty ? (
          <p className="pointer-events-none absolute top-s16 left-s16 z-(--z-raised) text-label text-fg-secondary">
            {emptyMessage ?? 'Sem dados ainda'}
          </p>
        ) : null}
        <ComposedChart
          responsive
          width="100%"
          height={height}
          data={[...points]}
          accessibilityLayer={false}
          margin={{ top: 12, right: 0, bottom: 0, left: 12 }}
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <YAxis
            orientation="right"
            ticks={isEmpty ? [] : range.ticks}
            domain={isEmpty ? [0, 1] : [range.bottom, range.top]}
            interval={0}
            width={64}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) => formatAxisValue(value)}
          />
          <XAxis
            dataKey="key"
            interval={0}
            ticks={valueTrendXTicks(points.map((point) => point.key))}
            padding={{ left: 8, right: 8 }}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tick={renderTick}
            height={24}
          />
          <Tooltip
            cursor={{ stroke: GRID_STROKE }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as ValueTrendPoint | undefined;
              return active && point ? (
                <ValueTrendTooltipCard
                  point={point}
                  valueLabel={valueLabel}
                  valueText={formatValue(point.value)}
                />
              ) : null;
            }}
          />
          <Line
            dataKey="value"
            stroke={LINE_STROKE}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: LINE_STROKE, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {last ? (
            <ReferenceDot
              x={last.key}
              y={last.value}
              r={4}
              fill={LINE_STROKE}
              stroke={SURFACE}
              strokeWidth={2}
            />
          ) : null}
        </ComposedChart>
      </div>

      <ChartDataTable
        caption={title}
        columns={['Momento', valueLabel]}
        rows={points.map((point) => [point.fullLabel, formatValue(point.value)])}
      />
    </section>
  );
}

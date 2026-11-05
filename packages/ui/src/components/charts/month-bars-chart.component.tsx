import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartDataTable } from '#/components/charts/chart-data-table.component.tsx';
import { formatChartMoneyForReader } from '#/components/charts/format-chart-money-for-reader.util.ts';
import type { MonthBar } from '#/components/charts/month-bars-chart.type.ts';
import { MonthBarsTooltipCard } from '#/components/charts/month-bars-tooltip.component.tsx';
import { formatAxisCents } from '#/components/charts/format-axis-cents.util.ts';
import { niceYAxis } from '#/components/charts/nice-y-axis.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';

const AXIS_TICK = { fontSize: 12, fill: 'var(--color-text-secondary)' } as const;
const BAR_FILL = 'var(--color-chart-bar)';
const HIGHLIGHT_FILL = 'var(--color-accent-default)';
const GRID_STROKE = 'var(--color-chart-grid)';
/** Room above the plot for the value written over the highlighted bar. */
const LABEL_ROOM = 22;

type MonthBarsChartProps = {
  /** Names the chart for assistive tech and its table ("Gasto por mês em Mercado"). */
  title: string;
  /** What a bar measures, said in the tip and the table ("Gasto", "Recebido"). */
  valueLabel: string;
  /** The months, oldest first. */
  bars: readonly MonthBar[];
  /** The `key` of the bar that stands out (the current month); none when it is out of the window. */
  highlightKey?: string | null;
  /** Shown over the plot when every bar is zero ("Sem gasto nos últimos 12 meses"). */
  emptyMessage?: string;
  /** Height of the plot in px. */
  height?: number;
};

type TickProps = { x?: number | string; y?: number | string; payload?: { value: string } };

/**
 * Monthly bars (12 months): one series, so no legend; the highlighted month is the accent color,
 * the others the quiet bar tone, and its label under the bar is heavier and darker, so the
 * highlight does not rely on color alone. Only the highlighted bar has its value written; the rest
 * is on the tip (hover) and the table. The plot is hidden from assistive tech; the table says the
 * same thing. Presentation only: it receives ready bars.
 */
export function MonthBarsChart({
  title,
  valueLabel,
  bars,
  highlightKey = null,
  emptyMessage,
  height = 200,
}: MonthBarsChartProps) {
  const hidden = useMoneyHidden();
  const isEmpty = bars.every((bar) => bar.cents <= 0);
  const axis = niceYAxis(Math.max(...bars.map((bar) => bar.cents), 0));
  const highlighted = bars.find((bar) => bar.key === highlightKey);

  function renderTick({ x = 0, y = 0, payload }: TickProps) {
    const bar = bars.find((item) => item.key === payload?.value);
    const isHighlight = bar?.key === highlightKey;

    return (
      <text
        x={Number(x)}
        y={Number(y) + 12}
        textAnchor="middle"
        fontSize={12}
        fontWeight={isHighlight ? 600 : 400}
        fill={isHighlight ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
      >
        {bar?.label}
      </text>
    );
  }

  return (
    <section aria-label={title} className="flex flex-col gap-s8">
      <div aria-hidden="true" className="relative font-body">
        {isEmpty && emptyMessage ? (
          <p className="pointer-events-none absolute top-s16 left-s16 z-(--z-raised) text-label text-fg-secondary">
            {emptyMessage}
          </p>
        ) : null}
        <BarChart
          responsive
          width="100%"
          height={height}
          data={[...bars]}
          accessibilityLayer={false}
          margin={{ top: LABEL_ROOM, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <YAxis
            orientation="right"
            ticks={axis.ticks}
            domain={[0, axis.top]}
            interval={0}
            width={44}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            tickFormatter={(value: number) => (hidden ? '••••' : formatAxisCents(value))}
          />
          <XAxis
            dataKey="key"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            tick={renderTick}
            height={24}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-subtle)', fillOpacity: 0.6 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const bar = payload?.[0]?.payload as MonthBar | undefined;
              return active && bar ? (
                <MonthBarsTooltipCard bar={bar} valueLabel={valueLabel} hidden={hidden} />
              ) : null;
            }}
          />
          <Bar
            dataKey="cents"
            maxBarSize={28}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            label={({ x, y, width, index, value }) => {
              const isHighlight = bars[Number(index)]?.key === highlightKey;
              if (!isHighlight || isEmpty || Number(value) <= 0) return null;
              const text = hidden
                ? '•••'
                : `R$ ${Math.round(Number(value) / 100).toLocaleString('pt-BR')}`;

              return (
                <text
                  x={Number(x) + Number(width)}
                  y={Number(y) - 6}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  className="tabular-nums"
                  fill="var(--color-text-primary)"
                >
                  {text}
                </text>
              );
            }}
          >
            {bars.map((bar) => (
              <Cell key={bar.key} fill={bar.key === highlightKey ? HIGHLIGHT_FILL : BAR_FILL} />
            ))}
          </Bar>
        </BarChart>
      </div>

      <ChartDataTable
        caption={`${title}${highlighted ? `, ${highlighted.fullLabel} em destaque` : ''}`}
        columns={['Mês', valueLabel, 'Transações']}
        rows={bars.map((bar) => [
          bar.fullLabel,
          formatChartMoneyForReader(bar.cents, hidden),
          bar.detail ?? '',
        ])}
      />
    </section>
  );
}

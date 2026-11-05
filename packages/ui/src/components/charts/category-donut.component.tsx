import { useState, type ReactNode } from 'react';
import { Pie, PieChart, Sector, type PieSectorShapeProps } from 'recharts';

import { CategoryDonutLegend } from '#/components/charts/category-donut-legend.component.tsx';
import { ChartDataTable } from '#/components/charts/chart-data-table.component.tsx';
import type { DonutSlice, PaintedSlice } from '#/components/charts/donut-slice.type.ts';
import { formatChartMoneyForReader } from '#/components/charts/format-chart-money-for-reader.util.ts';
import { paintSlices } from '#/components/charts/paint-slices.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';

const SIZE = 176;
const INNER_RADIUS = 64;
const OUTER_RADIUS = 88;
/** Width of the center text: the square inscribed in the hole (128 px) minus a clear ring of air. */
const CENTER_WIDTH = 92;
const FADED_OPACITY = 0.45;

type CategoryDonutProps = {
  /** Categories in the order they are listed; at most four are painted, the rest fold into "Outros". */
  slices: readonly DonutSlice[];
  /** First line of the center ("Gasto"). */
  centerLabel: string;
  /** Second line of the center: the category that matters ("Delivery"). */
  centerTitle: string;
  /** Third line of the center ("+108% que set."). */
  centerDetail?: string;
  /** Slot to the right of the legend (the "onde mais cresceu" card). */
  aside?: ReactNode;
};

/**
 * Donut by category with its center and legend (components.md 12.2). Presentation only. The gap
 * between slices and the named legend rows are extra encodings, so the slices never rely on color
 * alone. Hovering a slice or a legend row keeps it at 100% and puts the others at 45%.
 */
export function CategoryDonut({
  slices,
  centerLabel,
  centerTitle,
  centerDetail,
  aside,
}: CategoryDonutProps) {
  const hidden = useMoneyHidden();
  const [activeId, setActiveId] = useState<string | null>(null);
  const painted = paintSlices(slices);
  const isEmpty = painted.every((slice) => slice.cents <= 0);

  return (
    <div className="flex flex-col items-center gap-s24 lg:flex-row lg:items-start">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <div aria-hidden="true" onMouseLeave={() => setActiveId(null)}>
          <PieChart width={SIZE} height={SIZE} accessibilityLayer={false}>
            <Pie
              data={isEmpty ? [EMPTY_RING] : painted}
              dataKey="cents"
              nameKey="name"
              innerRadius={INNER_RADIUS}
              outerRadius={OUTER_RADIUS}
              startAngle={90}
              endAngle={-270}
              paddingAngle={isEmpty ? 0 : 2}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, index) => setActiveId(painted[index]?.id ?? null)}
              shape={(props: PieSectorShapeProps) => (
                <Sector
                  {...props}
                  fill={isEmpty ? 'var(--color-chart-bar)' : sliceColor(painted, props.index)}
                  fillOpacity={
                    activeId !== null && painted[props.index]?.id !== activeId ? FADED_OPACITY : 1
                  }
                />
              )}
            />
          </PieChart>
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className="flex flex-col items-center gap-s4 text-center"
            style={{ width: CENTER_WIDTH }}
          >
            <span className="text-caption leading-none text-fg-secondary">{centerLabel}</span>
            <span
              title={centerTitle}
              className="w-full truncate font-title text-list leading-tight font-plain text-fg-primary"
            >
              {centerTitle}
            </span>
            {centerDetail ? (
              <span
                title={centerDetail}
                className="w-full truncate text-caption leading-none text-fg-secondary tabular-nums"
              >
                {centerDetail}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-wrap items-start gap-x-s32 gap-y-s16">
        <CategoryDonutLegend slices={painted} activeId={activeId} onActiveChange={setActiveId} />
        {aside}
      </div>

      <ChartDataTable
        caption={`Gasto por categoria. ${centerLabel} ${centerTitle} ${centerDetail ?? ''}`.trim()}
        columns={['Categoria', 'Valor']}
        rows={painted.map((slice) => [slice.name, formatChartMoneyForReader(slice.cents, hidden)])}
      />
    </div>
  );
}

const EMPTY_RING = { id: 'empty', name: 'Sem gasto', cents: 1 };

function sliceColor(painted: readonly PaintedSlice[], index: number): string {
  return painted[index]?.color ?? 'var(--color-chart-pie-other)';
}

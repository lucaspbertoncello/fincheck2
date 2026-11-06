import type { PaintedSlice } from '#/components/charts/donut-slice.type.ts';
import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type CategoryDonutLegendProps = {
  slices: readonly PaintedSlice[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
};

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/**
 * Ordered legend of the donut: marker, name, value and the variation chip slot of each row. The
 * rows share one grid (subgrid), so the value column is as wide as the widest value and never
 * cuts, every value lines up on the right, and the chip column has a fixed width whether or not
 * a row has a chip.
 */
export function CategoryDonutLegend({
  slices,
  activeId,
  onActiveChange,
}: CategoryDonutLegendProps) {
  return (
    <ul className="grid min-w-72 max-w-full flex-1 basis-72 grid-cols-[auto_minmax(0,1fr)_max-content_5.5rem] gap-x-s12">
      {slices.map((slice) => (
        <li
          key={slice.id}
          onMouseEnter={() => onActiveChange(slice.id)}
          onMouseLeave={() => onActiveChange(null)}
          className={cx(
            'col-span-4 grid min-h-11 grid-cols-subgrid items-center border-b border-line py-s8 transition-opacity duration-(--duration-fast) last:border-b-0 motion-reduce:transition-none',
            activeId !== null && activeId !== slice.id && 'opacity-45',
          )}
        >
          <span
            aria-hidden="true"
            className="size-s8 shrink-0 rounded-capsule"
            style={{ background: slice.color }}
          />
          <span className="min-w-0 flex-1 truncate text-label text-fg-primary">{slice.name}</span>
          <span className="sr-only">{percent.format(slice.share)} do gasto</span>
          <Money
            cents={slice.cents}
            sign="none"
            showCents
            tone="expense"
            className="justify-self-end text-label whitespace-nowrap tabular-nums"
          />
          <span className="flex whitespace-nowrap">{slice.badge}</span>
        </li>
      ))}
    </ul>
  );
}

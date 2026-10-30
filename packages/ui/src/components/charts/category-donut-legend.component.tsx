import type { PaintedSlice } from '#/components/charts/donut-slice.type.ts';
import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type CategoryDonutLegendProps = {
  slices: readonly PaintedSlice[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
};

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** Ordered legend of the donut: marker, name, value and the variation chip slot of each row. */
export function CategoryDonutLegend({
  slices,
  activeId,
  onActiveChange,
}: CategoryDonutLegendProps) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col">
      {slices.map((slice) => (
        <li
          key={slice.id}
          onMouseEnter={() => onActiveChange(slice.id)}
          onMouseLeave={() => onActiveChange(null)}
          className={cx(
            'flex min-h-11 items-center gap-s12 border-b border-line py-s8 transition-opacity duration-(--duration-fast) last:border-b-0 motion-reduce:transition-none',
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
          <Money cents={slice.cents} sign="none" showCents className="text-label" />
          <span className="flex w-14 shrink-0 justify-end">{slice.badge}</span>
        </li>
      ))}
    </ul>
  );
}

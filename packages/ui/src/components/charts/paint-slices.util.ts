import type { DonutSlice, PaintedSlice } from '#/components/charts/donut-slice.type.ts';

const CATEGORY_COLORS = [
  'var(--color-chart-pie-1)',
  'var(--color-chart-pie-2)',
  'var(--color-chart-pie-3)',
  'var(--color-chart-pie-4)',
] as const;
const OTHER_COLOR = 'var(--color-chart-pie-other)';

/**
 * Folds everything past the fourth category into "Outros" (the palette has no fifth hue, and a
 * hue is never generated), then paints the slices in the fixed order: chart.1..4, "Outros" grey.
 */
export function paintSlices(slices: readonly DonutSlice[]): PaintedSlice[] {
  const named = slices.filter((slice) => !slice.isOther);
  const kept = named.slice(0, CATEGORY_COLORS.length);
  const folded = named.slice(CATEGORY_COLORS.length);
  const other = slices.find((slice) => slice.isOther);

  const foldedCents = folded.reduce((sum, slice) => sum + slice.cents, 0);
  const mergedOther: DonutSlice | undefined =
    folded.length > 0
      ? {
          id: other?.id ?? 'other',
          name: other?.name ?? 'Outros',
          isOther: true,
          cents: (other?.cents ?? 0) + foldedCents,
        }
      : other;

  const ordered = mergedOther ? [...kept, mergedOther] : kept;
  const total = ordered.reduce((sum, slice) => sum + slice.cents, 0);

  return ordered.map((slice, index) => ({
    ...slice,
    color: slice.isOther ? OTHER_COLOR : (CATEGORY_COLORS[index] ?? OTHER_COLOR),
    share: total > 0 ? slice.cents / total : 0,
  }));
}

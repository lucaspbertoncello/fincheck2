import type { SpendHeatmapLevel } from '#/components/heatmap/spend-heatmap.type.ts';

/**
 * One fill per level, from the brand green. The ramp is made of the brand token over transparent, so
 * it gets darker in the light theme and brighter in the dark one without a second set of colors.
 * Level 0 is the quiet surface with a hairline, so "nothing spent" is still a visible square.
 */
export const HEATMAP_LEVEL_CLASS: Record<SpendHeatmapLevel, string> = {
  0: 'bg-subtle shadow-[inset_0_0_0_1px_var(--color-line)]',
  1: 'bg-[color-mix(in_oklab,var(--color-brand)_32%,transparent)]',
  2: 'bg-[color-mix(in_oklab,var(--color-brand)_52%,transparent)]',
  3: 'bg-[color-mix(in_oklab,var(--color-brand)_76%,transparent)]',
  4: 'bg-brand',
};

export const HEATMAP_LEVELS: SpendHeatmapLevel[] = [0, 1, 2, 3, 4];

export const HEATMAP_MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/** Rows shown with a name at the left: Seg, Qua, Sex (the GitHub way). */
export const HEATMAP_WEEKDAY_LABELS: Record<number, string> = { 1: 'Seg', 3: 'Qua', 5: 'Sex' };

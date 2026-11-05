import type { SpendHeatmapLevel } from '#/components/heatmap/spend-heatmap.type.ts';

/**
 * One fill per level, from the `--color-heatmap-1..4` tokens (a green ramp with a set for each
 * theme). Level 1 is at least 3:1 against the card in both themes, so the lightest square is still
 * a visible square. Level 0 is the quiet surface with a hairline: "nothing spent" is also visible.
 */
export const HEATMAP_LEVEL_CLASS: Record<SpendHeatmapLevel, string> = {
  0: 'bg-subtle shadow-[inset_0_0_0_1px_var(--color-line)]',
  1: 'bg-(--color-heatmap-1)',
  2: 'bg-(--color-heatmap-2)',
  3: 'bg-(--color-heatmap-3)',
  4: 'bg-(--color-heatmap-4)',
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

/** The calendar header of the month view, Sunday first (the same order as the year map). */
export const HEATMAP_WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/**
 * The day number written inside a square of the month view. The text color follows the fill so it
 * keeps 4.5:1 in both themes: the ramp gets darker with the level in the light theme and lighter in
 * the dark one, and `--color-text-on-accent-solid` is white in the first and near black in the other.
 */
export const HEATMAP_DAY_NUMBER_CLASS: Record<SpendHeatmapLevel, string> = {
  0: 'text-fg-tertiary',
  1: 'text-fg-primary',
  2: 'text-(--color-text-on-accent-solid)',
  3: 'text-(--color-text-on-accent-solid)',
  4: 'text-(--color-text-on-accent-solid)',
};

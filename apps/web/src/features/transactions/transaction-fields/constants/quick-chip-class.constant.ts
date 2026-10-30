/**
 * The look of a quick-choice chip, the same as the "Hoje | Ontem" chips of `DateQuickField` and the
 * chips of `ChoiceField`: capsule, 1 px border that never changes width, weak accent when chosen.
 */
export const QUICK_CHIP_CLASS =
  'focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s8 rounded-capsule border border-line px-s16 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96 data-[hovered]:bg-subtle';

export const QUICK_CHIP_ON_CLASS = 'border-brand bg-brand-weak text-brand';

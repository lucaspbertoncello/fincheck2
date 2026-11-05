/** A choice chip of the modals: 40 px pill. The selected one only changes color, never size. */
export const CHIP_CLASS =
  'focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s8 rounded-capsule border border-line px-s16 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96 data-[hovered]:bg-subtle';

export const CHIP_ON_CLASS = 'border-brand bg-brand-weak text-brand';

/** "Outras…" and other open-ended chips. */
export const CHIP_GHOST_CLASS = 'border-dashed border-fg-tertiary';

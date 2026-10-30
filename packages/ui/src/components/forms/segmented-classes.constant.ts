// Visual shared by the value segmented control (forms) and the link one (navigation).

/** The glass track: padding 4, subtle fill, 1 px border. */
export const SEGMENTED_TRACK_CLASS = 'flex rounded-capsule border border-line bg-subtle p-s4';

/** One item: 44 px on the phone, 40 px on the desktop, equal widths. */
export const SEGMENTED_ITEM_CLASS =
  'focus-ring relative flex min-h-ctl-touch flex-1 cursor-pointer items-center justify-center gap-s8 rounded-capsule px-s16 text-label font-emphasis whitespace-nowrap no-underline transition-colors duration-(--duration-fast) lg:min-h-ctl-tab';

export const SEGMENTED_ITEM_ACTIVE_CLASS = 'text-fg-primary';
export const SEGMENTED_ITEM_INACTIVE_CLASS = 'text-fg-tertiary data-[hovered]:text-fg-primary';

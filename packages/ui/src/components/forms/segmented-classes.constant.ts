// Visual shared by the value segmented control (forms) and the link one (navigation).

/** The glass track: padding 4, subtle fill, 1 px border. */
export const SEGMENTED_TRACK_CLASS = 'flex rounded-capsule border border-line bg-subtle p-s4';

/**
 * One item without its width rule: 44 px on the phone, 40 px on the desktop, never wraps. The
 * label ellipsizes (with a `title`) only when even its own width does not fit.
 */
const SEGMENTED_ITEM_BASE_CLASS =
  'focus-ring relative flex min-h-ctl-touch min-w-0 cursor-pointer items-center justify-center gap-s8 rounded-capsule px-s12 text-label font-emphasis whitespace-nowrap no-underline transition-colors duration-(--duration-fast) lg:min-h-ctl-tab lg:px-s16';

/** Equal widths (two options with a sliding indicator, and the link version). */
export const SEGMENTED_ITEM_CLASS = `${SEGMENTED_ITEM_BASE_CLASS} flex-1`;

/** Content width first, the extra space shared: long and short labels all stay on one line. */
export const SEGMENTED_ITEM_FIT_CLASS = `${SEGMENTED_ITEM_BASE_CLASS} flex-auto`;

/**
 * Three or more links on the phone (Recorrências | A pagar e receber | Assinaturas): the icon goes
 * above the label (beside it the three need 361 px, and the phone has 338), content width first
 * and 8 px of padding, so the three labels fit on one line. From the desktop, the same as the others.
 */
export const SEGMENTED_ITEM_COMPACT_CLASS = `${SEGMENTED_ITEM_FIT_CLASS.replace('px-s12', 'px-s8')} max-lg:flex-col max-lg:gap-s4 max-lg:py-s8`;

export const SEGMENTED_ITEM_ACTIVE_CLASS = 'text-fg-primary';
export const SEGMENTED_ITEM_INACTIVE_CLASS = 'text-fg-tertiary data-[hovered]:text-fg-primary';

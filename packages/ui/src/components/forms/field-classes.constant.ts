// Visual shared by the text, money, search and date fields (components.md 5.4).

/** Label above the field: 14 px, secondary text. */
export const FIELD_LABEL_CLASS = 'text-label text-fg-secondary';

/** Helper text under the field. */
export const FIELD_DESCRIPTION_CLASS = 'text-meta text-fg-secondary';

/** Error message, right under the field. */
export const FIELD_ERROR_CLASS = 'text-meta text-alert';

/**
 * The box: 48 px, radius 12, 1 px border, 16 px text (no zoom on iOS). The focus is the
 * `field-ring` utility (fincheck.css): the border itself turns into the ring, so a field never has
 * an outline on top of its border. Invalid and focused states also live there.
 */
export const FIELD_BOX_CLASS =
  'field-ring min-h-ctl-field w-full rounded-input border border-line bg-field px-s16 text-body text-fg-primary outline-none placeholder:text-fg-tertiary data-[disabled]:opacity-50';

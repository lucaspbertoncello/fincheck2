// Visual shared by the text, money and search fields (components.md 5.4).

/** Label above the field: 14 px, secondary text. */
export const FIELD_LABEL_CLASS = 'text-label text-fg-secondary';

/** Helper text under the field. */
export const FIELD_DESCRIPTION_CLASS = 'text-meta text-fg-secondary';

/** Error message, right under the field. */
export const FIELD_ERROR_CLASS = 'text-meta text-alert';

/** The box: 48 px, radius 12, 1 px border, 16 px text (no zoom on iOS). */
export const FIELD_BOX_CLASS =
  'min-h-ctl-field w-full rounded-input border border-line bg-field px-s16 text-body text-fg-primary outline-none placeholder:text-fg-tertiary data-[focused]:border-brand data-[invalid]:border-alert data-[disabled]:opacity-50';

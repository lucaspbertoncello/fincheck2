/**
 * Panel widths on the desktop (components.md 13.2): 440, 560 for wide forms, 480 for dialogs and
 * 680 (`form`) for the form modal with two columns.
 */
export const MODAL_SIZE_CLASS = {
  default: 'lg:max-w-110',
  wide: 'lg:max-w-140',
  dialog: 'lg:max-w-120',
  form: 'lg:max-w-(--size-modal-form)',
} as const;

export type ModalSize = keyof typeof MODAL_SIZE_CLASS;

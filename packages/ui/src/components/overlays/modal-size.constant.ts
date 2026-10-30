/** Panel widths on the desktop (components.md 13.2): 440, 560 for wide forms, 480 for dialogs. */
export const MODAL_SIZE_CLASS = {
  default: 'lg:max-w-110',
  wide: 'lg:max-w-140',
  dialog: 'lg:max-w-120',
} as const;

export type ModalSize = keyof typeof MODAL_SIZE_CLASS;

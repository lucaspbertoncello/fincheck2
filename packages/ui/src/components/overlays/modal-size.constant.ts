/**
 * Panel box of every modal (components.md 13.6): width and height are fixed by the size, never by
 * the content. A choice inside the modal (Despesa | Receita, a tab, "Mais opções") changes what
 * the body shows, not the box: the body scrolls inside, header and footer stay. The width is
 * 480 / 520 / 640 / 760 on the desktop (the phone sheet is always screen minus 32). The height is
 * fixed too (the same on the phone sheet) and is cut by the `max-h` of `ModalFrame` when the
 * screen is shorter, so a 1280 x 720 window shows the form at 656 (screen minus 64), with no scroll.
 *
 * `confirm` is the exception: a confirmation (`ConfirmDialog`) has its whole content when it opens
 * and no choice inside that changes it, so its box follows the content (a fixed 480 left a 200 px
 * gap between the sentence and the buttons). Same width as `dialog`; the `max-h` of `ModalFrame`
 * still caps it.
 */
export const MODAL_SIZE_CLASS = {
  default: 'h-[32rem] lg:max-w-120',
  wide: 'h-[36rem] lg:max-w-160',
  dialog: 'h-[30rem] lg:max-w-130',
  confirm: 'lg:max-w-130',
  form: 'h-[44rem] lg:max-w-(--size-modal-form)',
} as const;

export type ModalSize = keyof typeof MODAL_SIZE_CLASS;

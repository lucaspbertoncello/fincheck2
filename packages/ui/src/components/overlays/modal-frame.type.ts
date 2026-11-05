import type { ReactNode } from 'react';
import type { ModalSize } from '#/components/overlays/modal-size.constant.ts';

export type ModalFrameProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Panel width on the desktop. On the phone the panel is always a sheet with 16 of side margin. */
  size?: ModalSize;
  /** "alertdialog" for a destructive confirmation: the dialog asks for an answer. */
  role?: 'dialog' | 'alertdialog';
  /** Click outside and Esc close it. Turn off while a save is running. */
  isDismissable?: boolean;
  /** Esc does not close it (while a save runs). Click outside is `isDismissable`. */
  isKeyboardDismissDisabled?: boolean;
  /** Taller sheet on the phone: 48 from the top instead of 72 (forms that need the room). */
  tall?: boolean;
  /** No padding and no gap in the panel: the content lays out its own header, body and footer. */
  bare?: boolean;
  /** Accessible name when the content has no `ModalHeader` (which names the dialog by its title). */
  label?: string;
  children: ReactNode;
  className?: string;
};

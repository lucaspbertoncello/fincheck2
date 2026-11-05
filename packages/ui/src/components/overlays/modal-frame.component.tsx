import type { ReactNode } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';

import { MODAL_SIZE_CLASS, type ModalSize } from '#/components/overlays/modal-size.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

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

/**
 * Overlay, blurred scrim and panel of every modal (components.md 13.2). Desktop: centered panel that
 * enters from `scale(.96)`. Phone: sheet that rises from the bottom, 16 from the sides, 24 from the
 * bottom and at most the screen minus 96 tall. Focus is trapped, Esc closes (React Aria). Motion is
 * `transform` and `opacity` only; `prefers-reduced-motion` shortens it in `fincheck.css`.
 */
export function ModalFrame({
  isOpen,
  onOpenChange,
  size = 'default',
  role = 'dialog',
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  bare = false,
  tall = false,
  label,
  children,
  className,
}: ModalFrameProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={isKeyboardDismissDisabled}
      className={cx(
        'fixed inset-0 z-(--z-modal) flex items-end justify-center bg-scrim px-s16 pb-s24 backdrop-blur-(--blur-glass) lg:items-center lg:p-s24',
        'transition-opacity duration-(--duration-base) ease-(--ease-standard) data-[entering]:opacity-0 data-[exiting]:opacity-0',
      )}
    >
      <Modal
        className={cx(
          'flex w-full min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-modal shadow-(--shadow-modal) backdrop-blur-(--blur-glass)',
          'transition-[transform,opacity] duration-(--duration-base) ease-(--ease-standard)',
          'data-[entering]:translate-y-full data-[entering]:opacity-0 data-[exiting]:translate-y-full data-[exiting]:opacity-0',
          'lg:data-[entering]:translate-y-0 lg:data-[entering]:scale-96 lg:data-[exiting]:translate-y-0 lg:data-[exiting]:scale-96',
          // Desktop: 32 above and below the box, so the form modal fits a 1280 x 720 window
          // (656 tall) without scrolling (polish 11).
          tall
            ? 'max-h-[calc(100dvh-var(--space-48)-var(--space-24))] lg:max-h-[calc(100dvh-var(--space-64))]'
            : 'max-h-[calc(100dvh-var(--space-64)-var(--space-32))] lg:max-h-[calc(100dvh-var(--space-64))]',
          MODAL_SIZE_CLASS[size],
          className,
        )}
      >
        <Dialog
          role={role}
          aria-label={label}
          className={cx(
            'flex min-h-0 flex-1 flex-col outline-none',
            !bare && 'gap-s16 overflow-y-auto p-s16 lg:p-s24',
          )}
        >
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

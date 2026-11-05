import type { ReactNode } from 'react';

import { ModalActions } from '#/components/overlays/modal-actions.component.tsx';
import { ModalFrame } from '#/components/overlays/modal-frame.component.tsx';
import type { ModalFrameProps } from '#/components/overlays/modal-frame.type.ts';
import { ModalHeader } from '#/components/overlays/modal-header.component.tsx';

type ModalProps = Pick<
  ModalFrameProps,
  'isOpen' | 'onOpenChange' | 'size' | 'isDismissable' | 'className'
> & {
  title: string;
  subtitle?: string;
  /** Fields and content; scrolls inside the panel when it is taller than the screen allows. */
  children: ReactNode;
  /** Secondary + primary buttons (`ModalActions` wraps them). */
  actions?: ReactNode;
  /** Destructive button pinned to the left of the actions. */
  destructiveAction?: ReactNode;
};

/**
 * Modal on the desktop, sheet on the phone (components.md 13.2): title, subtitle and "x", the
 * content, the actions. The form lives in the caller; this is presentation only.
 */
export function Modal({
  title,
  subtitle,
  children,
  actions,
  destructiveAction,
  ...frame
}: ModalProps) {
  return (
    <ModalFrame {...frame}>
      <ModalHeader title={title} subtitle={subtitle} />
      <div className="flex min-h-0 flex-1 flex-col gap-s16 overflow-y-auto">{children}</div>
      {actions || destructiveAction ? (
        <ModalActions destructive={destructiveAction}>{actions}</ModalActions>
      ) : null}
    </ModalFrame>
  );
}

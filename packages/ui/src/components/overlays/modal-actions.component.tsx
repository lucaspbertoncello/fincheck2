import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type ModalActionsProps = {
  /** Secondary + primary buttons. On the phone they stack, full width, primary on top. */
  children: ReactNode;
  /** Destructive action ("Excluir"), pinned to the left on the desktop ("split" actions). */
  destructive?: ReactNode;
  className?: string;
};

/**
 * Footer of a modal (components.md 13.2): buttons to the right on the desktop, the destructive one
 * alone on the left; on the phone, full-width 44 px buttons in a column.
 */
export function ModalActions({ children, destructive, className }: ModalActionsProps) {
  return (
    <footer
      className={cx(
        'mt-auto flex flex-col-reverse gap-s8 lg:flex-row lg:items-center lg:gap-s12',
        destructive ? 'lg:justify-between' : 'lg:justify-end',
        className,
      )}
    >
      {destructive ? <div className="flex flex-col lg:flex-row">{destructive}</div> : null}
      <div className="flex flex-col-reverse gap-s8 lg:flex-row lg:gap-s12 [&>*]:w-full lg:[&>*]:w-auto">
        {children}
      </div>
    </footer>
  );
}

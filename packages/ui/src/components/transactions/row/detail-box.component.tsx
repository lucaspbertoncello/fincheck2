import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type TransactionDetailBoxProps = {
  children: ReactNode;
  /** "warn" is the amber box ("O banco mudou o valor..."). */
  tone?: 'neutral' | 'warn';
  /** Selection mode shifts the box right (88 instead of 48 on the phone) to stay aligned with the text. */
  selectionMode?: boolean;
  className?: string;
};

/**
 * Box under a row (components.md 6, "Caixas de detalhe"): aligned with the row text, radius 16,
 * padding 12 × 16, 14 px text. The row's children slot takes one of these.
 */
export function TransactionDetailBox({
  children,
  tone = 'neutral',
  selectionMode = false,
  className,
}: TransactionDetailBoxProps) {
  return (
    <div
      className={cx(
        'mb-s16 rounded-panel px-s16 py-s12 text-label text-fg-primary',
        selectionMode ? 'ml-22 lg:ml-23' : 'ml-12 lg:ml-13',
        tone === 'warn' ? 'bg-caution-weak' : 'bg-subtle',
        className,
      )}
    >
      {children}
    </div>
  );
}

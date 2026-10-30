import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type TransactionDayListProps = {
  /** The `TransactionDayGroup`s, newest day first. */
  children: ReactNode;
  className?: string;
};

/** Column of day groups with 32 px between days (components.md 6, "Bloco do dia"). */
export function TransactionDayList({ children, className }: TransactionDayListProps) {
  return <div className={cx('flex flex-col gap-s32', className)}>{children}</div>;
}

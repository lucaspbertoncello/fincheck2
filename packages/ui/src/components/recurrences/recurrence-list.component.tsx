import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

/** List of recurrence rows with a 1 px rule between them. */
export function RecurrenceList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ul className={cx('flex flex-col divide-y divide-line', className)}>{children}</ul>;
}

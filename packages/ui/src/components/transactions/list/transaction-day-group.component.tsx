import { type ReactNode, useId } from 'react';

import { countLabel } from '#/components/transactions/list/count-label.util.ts';
import { GroupHeader } from '#/components/transactions/list/group-header.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type TransactionDayGroupProps = {
  /** "Hoje", "Ontem", "Terça". */
  title: string;
  /** "22 de outubro". */
  dateLabel: string;
  /** Number of transactions of the day. */
  count: number;
  /** Net total of the day in cents (negative shows "−"). */
  totalCents: number;
  /** The `TransactionRow`s of the day. */
  children: ReactNode;
  className?: string;
};

/**
 * One block of the day-grouped list (components.md 6, "Bloco do dia"): header with day, date,
 * count and total, then the rows. 32 px between blocks come from the parent gap.
 */
export function TransactionDayGroup({
  title,
  dateLabel,
  count,
  totalCents,
  children,
  className,
}: TransactionDayGroupProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cx('flex flex-col', className)}>
      <GroupHeader
        id={headingId}
        title={title}
        subtitle={dateLabel}
        countLabel={countLabel(count, 'transação', 'transações')}
        totalCents={totalCents}
      />
      <ul className="m-0 flex flex-col p-0">{children}</ul>
    </section>
  );
}

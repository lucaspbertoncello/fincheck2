import { TransactionDayGroup, TransactionDayList } from '@fincheck/ui';

import { InvoiceItemRow } from '#/features/invoices/invoice-page/components/invoice-item-row.component.tsx';
import type { InvoiceItemGroupData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceItemListProps = {
  groups: readonly InvoiceItemGroupData[];
};

/** The lines of the invoice by day (or in one block, by value), the blocks of Transações. */
export function InvoiceItemList({ groups }: InvoiceItemListProps) {
  return (
    <TransactionDayList>
      {groups.map((group) => (
        <TransactionDayGroup
          key={group.key}
          title={group.title}
          dateLabel={group.dateLabel}
          count={group.count}
          totalCents={group.totalCents}
        >
          {group.rows.map((row) => (
            <InvoiceItemRow key={row.key} row={row} />
          ))}
        </TransactionDayGroup>
      ))}
    </TransactionDayList>
  );
}

import { TransactionDayGroup, TransactionDayList, TransactionRow } from '@fincheck/ui';

import { RowDetail } from '#/features/transactions/transaction-list/components/row-detail.component.tsx';
import type {
  TransactionDayView,
  TransactionRowHandlers,
} from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type DayListProps = {
  days: TransactionDayView[];
  selectionActive: boolean;
  selectedIds: ReadonlySet<string>;
  handlers: TransactionRowHandlers;
};

/** The month as day blocks, newest first, each row with its detail boxes (the edit and split modals open over the list). */
export function DayList({ days, selectionActive, selectedIds, handlers }: DayListProps) {
  return (
    <TransactionDayList>
      {days.map((day) => (
        <TransactionDayGroup
          key={day.date}
          title={day.title}
          dateLabel={day.dateLabel}
          count={day.count}
          totalCents={day.totalCents}
        >
          {day.rows.map(({ row, details }) => {
            return (
              <TransactionRow
                key={row.id}
                transaction={row}
                selectionMode={selectionActive}
                selected={selectedIds.has(row.id)}
                onSelectedChange={handlers.onSelectedChange}
                onMenuAction={handlers.onMenuAction}
              >
                {details.map((detail) => (
                  <RowDetail
                    key={detail.kind}
                    transactionId={row.id}
                    detail={detail}
                    selectionMode={selectionActive}
                    handlers={handlers}
                  />
                ))}
              </TransactionRow>
            );
          })}
        </TransactionDayGroup>
      ))}
    </TransactionDayList>
  );
}

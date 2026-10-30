import { TransactionDayGroup, TransactionDayList, TransactionRow } from '@fincheck/ui';

import { RowDetail } from '#/features/transactions/transaction-list/components/row-detail.component.tsx';
import { RowEditor } from '#/features/transactions/transaction-list/components/row-editor.component.tsx';
import { RowSplitter } from '#/features/transactions/transaction-list/components/row-splitter.component.tsx';
import type {
  TransactionDayView,
  TransactionEditorView,
  TransactionRowHandlers,
  TransactionSplitterView,
} from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type DayListProps = {
  days: TransactionDayView[];
  selectionActive: boolean;
  selectedIds: ReadonlySet<string>;
  editor: TransactionEditorView | null;
  splitter: TransactionSplitterView | null;
  handlers: TransactionRowHandlers;
};

/** The month as day blocks, newest first, each row with its detail boxes and, when open, its edit or split panel. */
export function DayList({
  days,
  selectionActive,
  selectedIds,
  editor,
  splitter,
  handlers,
}: DayListProps) {
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
            const editing = editor?.transactionId === row.id;
            const splitting = splitter?.transactionId === row.id;

            return (
              <TransactionRow
                key={row.id}
                transaction={row}
                selectionMode={selectionActive}
                selected={selectedIds.has(row.id)}
                onSelectedChange={handlers.onSelectedChange}
                onMenuAction={handlers.onMenuAction}
              >
                {editing ? <RowEditor editor={editor} /> : null}
                {splitting ? <RowSplitter splitter={splitter} /> : null}
                {!editing && !splitting
                  ? details.map((detail) => (
                      <RowDetail
                        key={detail.kind}
                        transactionId={row.id}
                        detail={detail}
                        selectionMode={selectionActive}
                        handlers={handlers}
                      />
                    ))
                  : null}
              </TransactionRow>
            );
          })}
        </TransactionDayGroup>
      ))}
    </TransactionDayList>
  );
}

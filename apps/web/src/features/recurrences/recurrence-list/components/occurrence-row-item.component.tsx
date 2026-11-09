import { ExpectedValueUpdate, RecurrenceRow, type RecurrenceAction } from '@fincheck/ui';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type OccurrenceRowItemProps = {
  row: OccurrenceRowData;
  onAction: (row: OccurrenceRowData, action: RecurrenceAction) => void;
  /** Set inside "Precisa de você": the detail line is the reason, and a different amount asks here. */
  onDecideDifference?: (row: OccurrenceRowData, decision: 'update' | 'keep') => void;
};

/** A `RecurrenceRow` for one occurrence; while one of its actions runs the row is dimmed and inert. */
export function OccurrenceRowItem({ row, onAction, onDecideDifference }: OccurrenceRowItemProps) {
  const attention = onDecideDifference !== undefined;

  return (
    <RecurrenceRow
      name={row.name}
      icon={row.icon}
      service={row.service}
      flow={row.flow}
      rule={row.rule}
      account={row.account}
      status={row.status}
      statusNote={row.statusNote}
      amountCents={row.amountCents}
      expectedCents={row.expectedCents}
      remainingCents={row.remainingCents}
      excessCents={row.excessCents}
      transactions={row.transactions}
      carriedOver={row.carriedOver}
      inlineActions={row.inlineActions}
      detailMode={attention ? 'reason' : 'schedule'}
      decision={
        attention && row.difference ? (
          <ExpectedValueUpdate
            newCents={row.difference.newCents}
            keptCents={row.difference.keptCents}
            onUpdate={() => onDecideDifference(row, 'update')}
            onKeep={() => onDecideDifference(row, 'keep')}
          />
        ) : undefined
      }
      onAction={(action) => onAction(row, action)}
      className={row.pending ? 'pointer-events-none opacity-50' : undefined}
    />
  );
}

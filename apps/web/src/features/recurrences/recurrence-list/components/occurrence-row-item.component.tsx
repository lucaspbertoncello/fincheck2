import { RecurrenceRow, type RecurrenceAction } from '@fincheck/ui';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type OccurrenceRowItemProps = {
  row: OccurrenceRowData;
  onAction: (row: OccurrenceRowData, action: RecurrenceAction) => void;
};

/** A `RecurrenceRow` for one occurrence; while one of its actions runs the row is dimmed and inert. */
export function OccurrenceRowItem({ row, onAction }: OccurrenceRowItemProps) {
  return (
    <RecurrenceRow
      name={row.name}
      icon={row.icon}
      flow={row.flow}
      rule={row.rule}
      account={row.account}
      status={row.status}
      statusNote={row.statusNote}
      amountCents={row.amountCents}
      totalCents={row.totalCents}
      inlineActions={row.inlineActions}
      onAction={(action) => onAction(row, action)}
      className={row.pending ? 'pointer-events-none opacity-50' : undefined}
    />
  );
}

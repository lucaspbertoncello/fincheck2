import { CategoryIcon, Money, RecurrenceStatusChip } from '@fincheck/ui';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

/** What sits on the chosen day: name, state and the amount with its sign. */
export function DayOccurrenceList({ items }: { items: readonly OccurrenceRowData[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.occurrenceId} className="flex items-center gap-s12 py-s12">
          <CategoryIcon icon={item.icon} type={item.flow} />
          <div className="min-w-0 flex-1">
            <p className="text-body font-emphasis text-fg-primary">{item.name}</p>
            <p className="text-label text-fg-secondary">{item.statusNote}</p>
          </div>
          <RecurrenceStatusChip status={item.status} />
          <Money
            cents={item.amountCents}
            sign={item.flow === 'income' ? 'plus' : 'minus'}
            signColumn
            weight="plain"
            tone={item.flow === 'income' ? 'income' : 'inherit'}
            className="text-money-row"
          />
        </li>
      ))}
    </ul>
  );
}

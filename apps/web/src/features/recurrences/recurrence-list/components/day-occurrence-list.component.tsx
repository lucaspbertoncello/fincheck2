import { CategoryIcon, ListRow, Money, RecurrenceStatusChip, ServiceLogo } from '@fincheck/ui';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

/** What sits on the chosen day: standard rows with name, state chip, note and the signed amount. */
export function DayOccurrenceList({ items }: { items: readonly OccurrenceRowData[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <ListRow
          key={item.occurrenceId}
          mark={
            item.service ? (
              <ServiceLogo slug={item.service.slug} name={item.service.name} />
            ) : (
              <CategoryIcon icon={item.icon} type={item.flow} />
            )
          }
          name={item.name}
          badges={[<RecurrenceStatusChip key="status" status={item.status} />]}
          detail={item.statusNote}
          detailTitle={item.statusNote}
          value={
            <Money
              cents={item.amountCents}
              sign={item.flow === 'income' ? 'plus' : 'minus'}
              signColumn
              weight="plain"
              tone={item.flow}
              className="text-money-row"
            />
          }
        />
      ))}
    </ul>
  );
}

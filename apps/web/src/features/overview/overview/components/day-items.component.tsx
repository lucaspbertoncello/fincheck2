import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import { CategoryIcon, ListRow, Money, type IconName } from '@fincheck/ui';

type DayItemsProps = {
  items: readonly Timeline.Item[];
};

const SOURCE_ICON: Record<Timeline.Item['source']['type'], IconName> = {
  occurrence: 'repeat',
  invoice: 'card',
  bill: 'receipt',
};

function describeState(item: Timeline.Item): string {
  if (item.state === 'happened') return item.flow === 'in' ? 'Recebido' : 'Pago';
  if (item.state === 'partial') return 'Parcial';
  if (item.state === 'late') return 'Atrasado';
  return 'Esperado';
}

/** What goes in and out on the chosen day: standard rows, the state as the detail and the signed amount. */
export function DayItems({ items }: DayItemsProps) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
      {items.map((item) => (
        <ListRow
          key={item.key}
          mark={
            <CategoryIcon
              icon={SOURCE_ICON[item.source.type]}
              type={item.flow === 'in' ? 'income' : 'expense'}
            />
          }
          name={item.title}
          detail={describeState(item)}
          detailTitle={describeState(item)}
          value={
            <Money
              cents={item.amountCents}
              sign={item.flow === 'in' ? 'plus' : 'minus'}
              signColumn
              weight="plain"
              tone={item.flow === 'in' ? 'income' : 'expense'}
              className="text-money-row"
            />
          }
        />
      ))}
    </ul>
  );
}

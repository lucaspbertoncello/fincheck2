import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import { CategoryIcon, Money, type IconName } from '@fincheck/ui';

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

/** What goes in and out on the chosen day: icon, name, state and the amount with its sign. */
export function DayItems({ items }: DayItemsProps) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-s12 border-t border-line py-s12 first:border-t-0"
        >
          <CategoryIcon
            icon={SOURCE_ICON[item.source.type]}
            type={item.flow === 'in' ? 'income' : 'expense'}
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-list text-fg-primary">{item.title}</span>
            <span className="text-meta text-fg-secondary">{describeState(item)}</span>
          </span>
          {item.flow === 'in' ? (
            <Money cents={item.amountCents} sign="plus" tone="income" className="text-money-row" />
          ) : (
            <Money cents={item.amountCents} sign="minus" className="text-money-row" />
          )}
        </li>
      ))}
    </ul>
  );
}

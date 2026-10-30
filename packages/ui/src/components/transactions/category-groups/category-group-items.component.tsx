import { Button } from '#/components/buttons/index.ts';
import { Money } from '#/components/money/index.ts';
import type { CategoryGroupItem } from '#/components/transactions/category-groups/category-group.type.ts';

type CategoryGroupItemsProps = {
  items: readonly CategoryGroupItem[];
  kind: 'expense' | 'income';
  /** All transactions of the category, which may be more than `items`. */
  totalCount: number;
  onSeeAll?: () => void;
};

/** Open category: its last transactions in a subtle box (components.md 6.2) and the link to the list. */
export function CategoryGroupItems({ items, kind, totalCount, onSeeAll }: CategoryGroupItemsProps) {
  return (
    <div className="mb-s16 rounded-panel bg-subtle px-s16 pt-s4 pb-s12 lg:ml-14">
      <ul className="m-0 flex flex-col p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex list-none items-baseline gap-s12 border-b border-line py-s12 last:border-b-0"
          >
            <span className="w-12 shrink-0 text-meta text-fg-secondary lg:text-label">
              {item.dateLabel}
            </span>
            <span className="min-w-0 flex-1 text-list text-fg-primary">
              {item.name}
              <span className="hidden text-meta text-fg-secondary lg:ml-s8 lg:inline">
                {item.accountLabel}
              </span>
            </span>
            <Money
              cents={item.cents}
              sign={kind === 'income' ? 'plus' : 'minus'}
              weight="light"
              className="text-list"
            />
          </li>
        ))}
      </ul>
      {onSeeAll ? (
        <Button variant="tertiary" size="sm" onPress={onSeeAll} className="mt-s4 lg:ml-12">
          {totalCount === 1
            ? 'Ver a transação na lista'
            : `Ver as ${totalCount} transações na lista`}
        </Button>
      ) : null}
    </div>
  );
}

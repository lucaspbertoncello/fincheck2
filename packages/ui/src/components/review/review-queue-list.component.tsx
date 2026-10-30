import { Button } from '#/components/buttons/index.ts';
import { Chip, ChoiceChip } from '#/components/chips/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import type { ReviewQueueItemData } from '#/components/review/review.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type ReviewQueueListProps = {
  items: readonly ReviewQueueItemData[];
  /** Resolves an ambiguous item with one of its options ("Mesada ou VR?"). */
  onChoose: (itemId: string, optionId: string) => void;
  /** "Outra receita" of an ambiguous item. */
  onChooseOther: (itemId: string) => void;
  className?: string;
};

/**
 * "Na fila": the next transactions to review (components.md 11.1). Rows have no menu; an ambiguous
 * one (a Pix that could be two incomes) carries its own buttons to settle it in place.
 */
export function ReviewQueueList({
  items,
  onChoose,
  onChooseOther,
  className,
}: ReviewQueueListProps) {
  return (
    <ul className={cx('m-0 flex flex-col p-0', className)} aria-label="Na fila">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex list-none flex-col gap-s8 border-t border-line py-s12 first:border-t-0 lg:py-s16"
        >
          <div className="flex items-start gap-s12 lg:gap-s16">
            <CategoryIcon icon={item.icon} type={item.kind} />
            <div className="flex min-w-0 flex-1 flex-col gap-s4">
              <span className="text-body font-emphasis text-fg-primary">{item.name}</span>
              <div className="flex flex-col items-start gap-s4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-s8">
                <span className="text-meta text-fg-secondary lg:text-label">{item.detail}</span>
                {item.ambiguity ? (
                  <Chip tone="warn">{item.ambiguity.message}</Chip>
                ) : (
                  <Chip tone="dashed">Para revisar</Chip>
                )}
              </div>
            </div>
            <Money
              cents={item.amountCents}
              sign={item.amountCents > 0 ? 'plus' : 'minus'}
              weight="plain"
              tone={item.amountCents > 0 ? 'income' : 'inherit'}
              className="text-money-row"
            />
          </div>
          {item.ambiguity ? (
            <div
              role="group"
              aria-label={`Resolver ${item.name}`}
              className="ml-12 flex flex-wrap items-center gap-s8 lg:ml-14"
            >
              {item.ambiguity.options.map((option) => (
                <ChoiceChip
                  key={option.id}
                  icon={option.icon}
                  selected={false}
                  onChange={() => onChoose(item.id, option.id)}
                >
                  {option.label}
                </ChoiceChip>
              ))}
              <Button variant="tertiary" size="sm" onPress={() => onChooseOther(item.id)}>
                {item.ambiguity.otherLabel}
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

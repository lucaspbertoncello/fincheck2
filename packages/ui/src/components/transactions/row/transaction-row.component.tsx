import type { ReactNode } from 'react';

import { Checkbox } from '#/components/forms/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { OverflowMenu } from '#/components/menus/index.ts';
import { Money } from '#/components/money/index.ts';
import { TransactionRowChips } from '#/components/transactions/row/transaction-row-chips.component.tsx';
import {
  IGNORED_TRANSACTION_MENU_ITEMS,
  TRANSACTION_MENU_ITEMS,
} from '#/components/transactions/row/transaction-row-menu.constant.ts';
import type {
  TransactionMenuKey,
  TransactionRowData,
} from '#/components/transactions/row/transaction-row.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type TransactionRowProps = {
  transaction: TransactionRowData;
  /** Selection mode: a checkbox appears at the left of the row. */
  selectionMode?: boolean;
  selected?: boolean;
  onSelectedChange?: (id: string, selected: boolean) => void;
  onMenuAction?: (id: string, action: TransactionMenuKey) => void;
  /** Detail boxes under the row: `TransactionDetailBox`, `CategorySuggestion`... */
  children?: ReactNode;
  className?: string;
};

function moneyTone(transaction: TransactionRowData) {
  if (transaction.ignored || transaction.outOfAccount) return 'faded' as const;
  return transaction.amountCents > 0 ? ('income' as const) : ('inherit' as const);
}

/**
 * Transaction row (components.md 6): category icon with type badge, name (two lines on the phone,
 * ui adjustment 12), metadata and chips, amount at the top right and the "…" menu. Lives inside a
 * `TransactionDayGroup` list. The amount goes through `Money`, so hiding values just works.
 */
export function TransactionRow({
  transaction,
  selectionMode = false,
  selected = false,
  onSelectedChange,
  onMenuAction,
  children,
  className,
}: TransactionRowProps) {
  const { id, name, ignored } = transaction;
  const categoryLabel =
    transaction.categoryName || (transaction.uncategorized ? 'Sem categoria' : '');
  const meta = [categoryLabel, transaction.accountLabel].filter(Boolean);

  return (
    <li
      data-selected={selected || undefined}
      data-ignored={ignored || undefined}
      data-selection={selectionMode || undefined}
      className={cx('group/row relative list-none', className)}
    >
      <span
        aria-hidden="true"
        className="ml-12 block h-px bg-line group-first/row:hidden group-data-[selected]/row:hidden group-data-[selection]/row:ml-23 lg:ml-14"
      />
      <div
        className={cx(
          'flex items-start gap-s12 py-s12 lg:min-h-18 lg:gap-s16 lg:py-s16',
          selected && 'rounded-input bg-brand-weak',
        )}
      >
        {selectionMode ? (
          <Checkbox
            isSelected={selected}
            onChange={(next) => onSelectedChange?.(id, next)}
            ariaLabel={`Selecionar ${name}`}
            className="-my-s8 -mr-s8 -ml-s8"
          />
        ) : null}
        <CategoryIcon
          icon={transaction.categoryIcon}
          type={transaction.kind}
          dashed={transaction.uncategorized}
          className={cx(ignored && 'opacity-60')}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-s4">
          <span
            className={cx(
              'line-clamp-2 text-body font-emphasis lg:line-clamp-1',
              ignored ? 'text-fg-secondary' : 'text-fg-primary',
            )}
          >
            {name}
          </span>
          <div className="flex flex-col items-start gap-s4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-s8">
            <p className="flex flex-col text-meta text-fg-secondary lg:flex-row lg:items-center lg:gap-s8 lg:text-label">
              {meta.map((part, index) => (
                <span key={part} className="flex items-center gap-s8">
                  {index > 0 ? (
                    <span aria-hidden="true" className="hidden lg:inline">
                      •
                    </span>
                  ) : null}
                  {part}
                </span>
              ))}
            </p>
            <div className="flex flex-wrap items-center gap-s4 lg:gap-s8">
              <TransactionRowChips transaction={transaction} />
            </div>
          </div>
        </div>
        <Money
          cents={transaction.amountCents}
          sign={transaction.amountCents > 0 ? 'plus' : 'minus'}
          weight="plain"
          tone={moneyTone(transaction)}
          className={cx('text-money-row', ignored && 'line-through')}
        />
        <OverflowMenu
          label={`Ações de ${name}`}
          items={ignored ? IGNORED_TRANSACTION_MENU_ITEMS : TRANSACTION_MENU_ITEMS}
          onAction={(key) => onMenuAction?.(id, key as TransactionMenuKey)}
          className="-my-s8 -mr-s8"
        />
      </div>
      {children}
    </li>
  );
}

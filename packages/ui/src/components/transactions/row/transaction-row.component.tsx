import type { ReactNode } from 'react';

import { Checkbox } from '#/components/forms/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { ListRow } from '#/components/list-row/index.ts';
import { OverflowMenu } from '#/components/menus/index.ts';
import { Money } from '#/components/money/index.ts';
import { buildTransactionRowFlags } from '#/components/transactions/row/build-transaction-row-flags.util.tsx';
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

/** Chips a row shows; the rest of the flags go to the detail line. */
const MAX_CHIPS = 2;

function moneyTone(transaction: TransactionRowData) {
  if (transaction.ignored || transaction.outOfAccount) return 'faded' as const;
  return transaction.amountCents > 0 ? ('income' as const) : ('inherit' as const);
}

/**
 * Transaction row (components.md 6 and 10.0): the standard `ListRow` with the category icon and
 * type badge, the name on one line, "category · account" (plus whatever did not fit in the two
 * chips) on the detail line, the amount at the right end with the sign column and the "…" menu in
 * its own column. Lives inside a `TransactionDayGroup` list; the detail boxes go under it. The
 * amount goes through `Money`, so hiding values just works.
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
  const flags = buildTransactionRowFlags(transaction);
  const chips = flags.slice(0, MAX_CHIPS);
  const overflow = flags.slice(MAX_CHIPS);
  const base = [categoryLabel, transaction.accountLabel].filter(Boolean);
  const parts = [...base, ...overflow.map((flag) => flag.node)];
  const plainParts = overflow.map((flag) => flag.text);
  const plainDetail = plainParts.every((text) => text !== undefined)
    ? [...base, ...plainParts].join(' · ')
    : undefined;
  const [firstChip, secondChip] = chips;

  return (
    <li
      data-selected={selected || undefined}
      data-ignored={ignored || undefined}
      data-selection={selectionMode || undefined}
      className={cx('group/row relative list-none', className)}
    >
      <span
        aria-hidden="true"
        className="ml-12 block h-px bg-line group-first/row:hidden group-data-[selected]/row:hidden group-data-[selection]/row:ml-22 lg:ml-13 lg:group-data-[selection]/row:ml-23"
      />
      <ul className="m-0 flex list-none flex-col p-0">
        <ListRow
          className={cx(selected && 'rounded-input bg-brand-weak')}
          mark={
            <span className="flex items-center gap-s12">
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
            </span>
          }
          name={name}
          nameClassName={ignored ? 'text-fg-secondary' : undefined}
          badges={
            firstChip && secondChip
              ? [firstChip.chip, secondChip.chip]
              : firstChip
                ? [firstChip.chip]
                : undefined
          }
          detail={parts.map((part, index) => (
            <span key={index}>
              {index > 0 ? ' · ' : null}
              {part}
            </span>
          ))}
          detailTitle={plainDetail}
          value={
            <Money
              cents={transaction.amountCents}
              sign={transaction.amountCents > 0 ? 'plus' : 'minus'}
              signColumn
              weight="plain"
              tone={moneyTone(transaction)}
              className={cx('text-money-row', ignored && 'line-through')}
            />
          }
          menu={
            <OverflowMenu
              label={`Ações de ${name}`}
              items={ignored ? IGNORED_TRANSACTION_MENU_ITEMS : TRANSACTION_MENU_ITEMS}
              onAction={(key) => onMenuAction?.(id, key as TransactionMenuKey)}
            />
          }
        />
      </ul>
      {children}
    </li>
  );
}

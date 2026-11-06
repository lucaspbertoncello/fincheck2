import { Chip, ListRow, Money, type ListRowBadges } from '@fincheck/ui';

import { InvoiceItemMark } from '#/features/invoices/invoice-page/components/invoice-item-mark.component.tsx';
import type { InvoiceItemRowData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceItemRowProps = {
  row: InvoiceItemRowData;
};

/**
 * One line of the invoice on the standard row of Transações: the mark, the name, the badges (the
 * installment "3/10" and "Estorno"), the category on the detail line and the value at the right
 * end. It has no "…" menu, since a line of the invoice is edited in Transações.
 */
export function InvoiceItemRow({ row }: InvoiceItemRowProps) {
  const [first, second] = row.badges;
  const badges: ListRowBadges | undefined =
    first && second ? [chipOf(first), chipOf(second)] : first ? [chipOf(first)] : undefined;
  const isRefund = row.cents > 0;

  return (
    <li className="group/row relative list-none">
      <span
        aria-hidden="true"
        className="ml-12 block h-px bg-line group-first/row:hidden lg:ml-13"
      />
      <ul className="m-0 flex list-none flex-col p-0">
        <ListRow
          mark={<InvoiceItemMark mark={row.mark} />}
          name={row.title}
          nameClassName={row.expected ? 'text-fg-secondary' : undefined}
          badges={badges}
          detail={row.detail}
          detailTitle={row.detail}
          value={
            <Money
              cents={row.cents}
              sign={isRefund ? 'plus' : 'minus'}
              signColumn
              weight="plain"
              tone={row.expected ? 'faded' : isRefund ? 'income' : 'expense'}
              className="text-money-row"
            />
          }
        />
      </ul>
    </li>
  );
}

function chipOf(badge: InvoiceItemRowData['badges'][number]) {
  return (
    <span title={badge.description}>
      <Chip tone={badge.tone}>
        <span className="sr-only">{badge.description}</span>
        <span aria-hidden="true">{badge.label}</span>
      </Chip>
    </span>
  );
}

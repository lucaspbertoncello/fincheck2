import { Money } from '@fincheck/ui';

import type { InvoiceDetailItem } from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

type InvoiceItemListProps = {
  items: readonly InvoiceDetailItem[];
};

/** Every purchase, installment, refund and expected recurrence of the invoice, in the order the API sends. */
export function InvoiceItemList({ items }: InvoiceItemListProps) {
  if (items.length === 0) {
    return <p className="py-s8 text-label text-fg-secondary">Nenhum lançamento nesta fatura.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.key}
          className="flex items-center gap-s12 border-t border-line py-s12 text-label text-fg-primary first:border-t-0"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{item.title}</span>
            <span className="text-meta text-fg-secondary">{item.meta}</span>
          </span>
          <Money
            cents={item.cents}
            sign="auto"
            weight="plain"
            tone={item.expected ? 'faded' : 'inherit'}
          />
        </li>
      ))}
    </ul>
  );
}

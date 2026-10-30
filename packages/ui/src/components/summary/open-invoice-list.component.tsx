import type { FreeBalanceInvoice } from '#/components/summary/free-balance.type.ts';
import { PanelListRow } from '#/components/summary/panel-list-row.component.tsx';

type OpenInvoiceListProps = {
  title: string;
  items: FreeBalanceInvoice[];
};

/** "Faturas abertas" of the panel: mini card (40 × 26), due date, amount (components.md 2.3). */
export function OpenInvoiceList({ title, items }: OpenInvoiceListProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-s4">
      <h2 className="font-title text-section font-heading text-fg-primary">{title}</h2>
      <ul>
        {items.map((invoice) => (
          <PanelListRow
            key={invoice.id}
            mark={
              invoice.mark ?? (
                <span
                  aria-hidden="true"
                  className="h-6.5 w-10 shrink-0 rounded-tiny bg-(image:--gradient-pingo)"
                />
              )
            }
            name={invoice.name}
            subtitle={invoice.subtitle}
            cents={invoice.amountCents}
          />
        ))}
      </ul>
    </section>
  );
}

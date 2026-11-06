import { Button, Collapse, Money } from '@fincheck/ui';
import { useId, useState } from 'react';

import type { InstallmentPreview as InstallmentPreviewData } from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';

type InstallmentPreviewProps = {
  preview: InstallmentPreviewData;
};

function lower(label: string): string {
  return label.toLowerCase();
}

/**
 * What the purchase will do, in one glance: "10× de R$ 89,90", the first and last invoice, and the
 * total. When the cents do not divide evenly the headline says so ("1× de R$ 89,92 e 9× de R$ 89,90"),
 * the same split the API saves. "Ver parcelas" lists every installment with its invoice.
 */
export function InstallmentPreview({ preview }: InstallmentPreviewProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const even = preview.firstCents === preview.restCents;

  return (
    <section
      aria-label="Prévia das parcelas"
      className="flex flex-col rounded-panel bg-subtle px-s16 py-s12"
    >
      <div className="flex items-start justify-between gap-s12">
        <div className="flex min-w-0 flex-col gap-s4">
          <p className="flex flex-wrap items-baseline gap-x-s8 text-money-md text-fg-primary">
            {even ? (
              <>
                <span className="money-numeric">{preview.count}×</span>
                <span className="text-label text-fg-secondary">de</span>
                <Money cents={preview.firstCents} sign="none" />
              </>
            ) : (
              <>
                <span className="money-numeric">1×</span>
                <span className="text-label text-fg-secondary">de</span>
                <Money cents={preview.firstCents} sign="none" />
                <span className="text-label text-fg-secondary">e</span>
                <span className="money-numeric">{preview.count - 1}×</span>
                <span className="text-label text-fg-secondary">de</span>
                <Money cents={preview.restCents} sign="none" />
              </>
            )}
          </p>
          <p className="text-label text-fg-secondary">
            A 1ª na fatura de {lower(preview.firstMonthLabel)}, a última em{' '}
            {lower(preview.lastMonthLabel)}. Total{' '}
            <Money
              cents={preview.totalCents}
              sign="none"
              tone="expense"
              weight="plain"
              className="text-label"
            />
            .
          </p>
        </div>
        <Button
          variant="tertiary"
          size="sm"
          aria-expanded={open}
          aria-controls={listId}
          onPress={() => setOpen((current) => !current)}
        >
          {open ? 'Ocultar' : 'Ver parcelas'}
        </Button>
      </div>
      <Collapse isOpen={open} id={listId} contentClassName="pt-s8">
        <ul className="m-0 flex max-h-40 flex-col gap-s4 overflow-y-auto border-t border-line p-0 pt-s8">
          {preview.rows.map((row) => (
            <li
              key={row.number}
              className="flex list-none items-baseline justify-between gap-s12 text-label text-fg-secondary"
            >
              <span>
                {row.number}/{preview.count} · fatura de {lower(row.monthLabel)}
              </span>
              <Money cents={row.cents} sign="none" weight="plain" tone="expense" />
            </li>
          ))}
        </ul>
      </Collapse>
    </section>
  );
}

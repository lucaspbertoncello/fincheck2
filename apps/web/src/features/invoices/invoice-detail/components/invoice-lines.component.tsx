import { Money } from '@fincheck/ui';

import type { InvoiceDetailLine } from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

type InvoiceLinesProps = {
  lines: readonly InvoiceDetailLine[];
};

/** Label and amount per line, a hairline between them: what the invoice is made of. */
export function InvoiceLines({ lines }: InvoiceLinesProps) {
  return (
    <ul>
      {lines.map((line) => (
        <li
          key={line.key}
          className="flex items-center justify-between gap-s12 border-t border-line py-s8 text-label text-fg-primary first:border-t-0"
        >
          <span className="text-fg-secondary">{line.label}</span>
          <Money cents={line.cents} sign="none" weight="plain" />
        </li>
      ))}
    </ul>
  );
}

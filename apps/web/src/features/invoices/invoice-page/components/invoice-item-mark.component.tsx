import { CategoryIcon } from '@fincheck/ui';

import type { InvoiceItemMarkData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceItemMarkProps = {
  mark: InvoiceItemMarkData;
};

/**
 * What goes at the left of an invoice line, decided in one place: today the icon of the category
 * with its type badge. The subscription logo (BR-REC-017) enters here, as a new `kind` of mark.
 */
export function InvoiceItemMark({ mark }: InvoiceItemMarkProps) {
  return <CategoryIcon icon={mark.icon} type={mark.type} dashed={mark.uncategorized} />;
}

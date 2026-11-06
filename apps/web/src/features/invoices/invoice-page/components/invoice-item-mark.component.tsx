import { CategoryIcon, ServiceLogo } from '@fincheck/ui';

import type { InvoiceItemMarkData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceItemMarkProps = {
  mark: InvoiceItemMarkData;
};

/**
 * What goes at the left of an invoice line, decided in one place: the icon of the category with its
 * type badge, or the logo of the subscription service the line is (BR-REC-017).
 */
export function InvoiceItemMark({ mark }: InvoiceItemMarkProps) {
  if (mark.kind === 'subscription') {
    return <ServiceLogo slug={mark.service.slug} />;
  }

  return <CategoryIcon icon={mark.icon} type={mark.type} dashed={mark.uncategorized} />;
}

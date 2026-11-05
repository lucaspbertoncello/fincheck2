import { CorrectInvoiceViewModel } from '#/features/invoices/correct-invoice/correct-invoice.viewmodel.tsx';
import { InvoicePageViewModel } from '#/features/invoices/invoice-page/invoice-page.viewmodel.tsx';

/** A card invoice (BR-INV-006): the page and the "Corrigir valor" modal that opens over it. */
export function InvoicePage() {
  return (
    <>
      <InvoicePageViewModel />
      <CorrectInvoiceViewModel />
    </>
  );
}

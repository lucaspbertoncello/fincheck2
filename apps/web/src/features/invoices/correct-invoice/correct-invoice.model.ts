import { useCardInvoice } from '#/domain/invoices/invoice/hooks/use-card-invoice.hook.ts';
import { useUpdateInvoice } from '#/domain/invoices/invoice/hooks/use-update-invoice.hook.ts';

/** The invoice being corrected and the correction (`PATCH /cards/:accountId/invoices/:month`). */
export function useCorrectInvoiceModel(target: { accountId: string; month: string } | null) {
  const invoice = useCardInvoice(target?.accountId ?? '', target?.month ?? '', {
    enabled: target !== null,
  });

  return {
    invoice: invoice.data,
    isLoading: target !== null && invoice.isPending,
    isError: invoice.isError,
    retry: () => void invoice.refetch(),
    update: useUpdateInvoice(),
  };
}

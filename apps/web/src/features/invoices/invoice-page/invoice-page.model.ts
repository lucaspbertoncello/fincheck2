import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCardInvoice } from '#/domain/invoices/invoice/hooks/use-card-invoice.hook.ts';
import { useCardInvoices } from '#/domain/invoices/invoice/hooks/use-card-invoices.hook.ts';
import { useCreateInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-create-invoice-payment.hook.ts';
import { useDeleteInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-delete-invoice-payment.hook.ts';
import { useDismissInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-dismiss-invoice-payment-suggestion.hook.ts';
import { useRestoreInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-restore-invoice-payment-suggestion.hook.ts';

/**
 * What the invoice page reads and writes: the invoice with its lines, the card it belongs to, the
 * categories (names and icons), the months the card lists (the limit of the arrows) and the
 * payment actions.
 */
export function useInvoicePageModel(accountId: string, month: string) {
  const invoice = useCardInvoice(accountId, month);
  const card = useAccount(accountId);
  const categories = useCategories({ status: 'all' });
  const listed = useCardInvoices(accountId);

  return {
    invoice: invoice.data,
    cardName: card.data?.name ?? '',
    categories: categories.data?.items ?? [],
    listedMonths: (listed.data?.items ?? []).map((item) => item.month),
    isLoading: invoice.isPending || card.isPending || categories.isPending,
    isError: invoice.isError || card.isError || categories.isError,
    retry: () => {
      void invoice.refetch();
      void card.refetch();
      void categories.refetch();
    },
    createPayment: useCreateInvoicePayment(),
    deletePayment: useDeleteInvoicePayment(),
    dismissSuggestion: useDismissInvoicePaymentSuggestion(),
    restoreSuggestion: useRestoreInvoicePaymentSuggestion(),
  };
}

export type InvoicePageModel = ReturnType<typeof useInvoicePageModel>;

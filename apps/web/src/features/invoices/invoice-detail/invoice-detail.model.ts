import { useAccount } from '#/domain/accounts/account/hooks/use-account.hook.ts';
import { useCardInvoice } from '#/domain/invoices/invoice/hooks/use-card-invoice.hook.ts';
import { useCreateInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-create-invoice-payment.hook.ts';
import { useDeleteInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-delete-invoice-payment.hook.ts';
import { useDismissInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-dismiss-invoice-payment-suggestion.hook.ts';
import { useRestoreInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-restore-invoice-payment-suggestion.hook.ts';

/** The invoice with its items, the card it belongs to and the payment actions. */
export function useInvoiceDetailModel(target: { accountId: string; month: string } | null) {
  const enabled = target !== null;
  const invoice = useCardInvoice(target?.accountId ?? '', target?.month ?? '', { enabled });
  const card = useAccount(target?.accountId ?? '', { enabled });

  return {
    invoice: invoice.data,
    cardName: card.data?.name ?? '',
    isLoading: enabled && (invoice.isPending || card.isPending),
    isError: invoice.isError,
    retry: () => void invoice.refetch(),
    createPayment: useCreateInvoicePayment(),
    deletePayment: useDeleteInvoicePayment(),
    dismissSuggestion: useDismissInvoicePaymentSuggestion(),
    restoreSuggestion: useRestoreInvoicePaymentSuggestion(),
  };
}

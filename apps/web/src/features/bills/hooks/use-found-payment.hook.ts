import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { useToast } from '@fincheck/ui';

import { useDeleteBillPayment } from '#/domain/bills/bill-payment/hooks/use-delete-bill-payment.hook.ts';
import { useCreateBillPayment } from '#/domain/bills/bill-payment/hooks/use-create-bill-payment.hook.ts';
import { useDismissBillPaymentSuggestion } from '#/domain/bills/bill-payment/hooks/use-dismiss-bill-payment-suggestion.hook.ts';
import { useRestoreBillPaymentSuggestion } from '#/domain/bills/bill-payment/hooks/use-restore-bill-payment-suggestion.hook.ts';
import { useCreateInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-create-invoice-payment.hook.ts';
import { useDeleteInvoicePayment } from '#/domain/invoices/invoice-payment/hooks/use-delete-invoice-payment.hook.ts';
import { useDismissInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-dismiss-invoice-payment-suggestion.hook.ts';
import { useRestoreInvoicePaymentSuggestion } from '#/domain/invoices/invoice-payment/hooks/use-restore-invoice-payment-suggestion.hook.ts';
import { resolvePaymentTarget } from '#/features/bills/bill-list/utils/resolve-payment-target.util.ts';

/** The transaction the API found for an item: the invoice's "Pagamento encontrado" or the presumed one of a bill. */
export function findPaymentTransactionId(item: Agenda.Item): string | null {
  return item.paymentFound?.transactionId ?? item.presumedTransactionId;
}

/**
 * The two answers to a payment the API found: "Vincular" (turns it into the payment of the item)
 * and "Não é este" (stops suggesting that transaction). Both come with a toast to undo them.
 * The calls reject with the `ApiError` so the caller can show it next to the action.
 */
export function useFoundPayment() {
  const { showUndoToast } = useToast();
  const createBillPayment = useCreateBillPayment();
  const deleteBillPayment = useDeleteBillPayment();
  const dismissBill = useDismissBillPaymentSuggestion();
  const restoreBill = useRestoreBillPaymentSuggestion();
  const createInvoicePayment = useCreateInvoicePayment();
  const deleteInvoicePayment = useDeleteInvoicePayment();
  const dismissInvoice = useDismissInvoicePaymentSuggestion();
  const restoreInvoice = useRestoreInvoicePaymentSuggestion();

  const isPending =
    createBillPayment.isPending ||
    createInvoicePayment.isPending ||
    dismissBill.isPending ||
    dismissInvoice.isPending;

  async function link(item: Agenda.Item): Promise<void> {
    const target = resolvePaymentTarget(item);
    const transactionId = findPaymentTransactionId(item);
    if (!target || !transactionId) return;

    if (target.kind === 'bill') {
      const bill = await createBillPayment.mutateAsync({
        id: target.billId,
        body: { transactionId },
      });
      const payment = bill.payments.find((entry) => entry.transactionId === transactionId);
      showUndoToast({
        message: `${item.title}: pagamento vinculado.`,
        withIcon: true,
        onUndo: () => {
          if (payment) deleteBillPayment.mutate({ id: target.billId, paymentId: payment.id });
        },
      });
    } else if (target.kind === 'invoice' && item.paymentFound) {
      const amountCents = Math.min(
        Math.abs(item.paymentFound.amountCents),
        item.amountCents - item.paidCents,
      );
      const invoice = await createInvoicePayment.mutateAsync({
        accountId: target.accountId,
        month: target.month,
        body: { amountCents, paidOn: item.paymentFound.occurredOn, transactionId },
      });
      const payment = invoice.payments.find((entry) => entry.transactionId === transactionId);
      showUndoToast({
        message: `${item.title}: pagamento vinculado.`,
        withIcon: true,
        onUndo: () => {
          if (payment) {
            deleteInvoicePayment.mutate({
              accountId: target.accountId,
              month: target.month,
              paymentId: payment.id,
            });
          }
        },
      });
    }
  }

  async function dismiss(item: Agenda.Item): Promise<void> {
    const target = resolvePaymentTarget(item);
    const transactionId = findPaymentTransactionId(item);
    if (!target || !transactionId) return;

    if (target.kind === 'bill') {
      await dismissBill.mutateAsync({ id: target.billId, body: { transactionId } });
      showUndoToast({
        message: 'Combinado: esse não é o pagamento.',
        onUndo: () => restoreBill.mutate({ id: target.billId, transactionId }),
      });
    } else if (target.kind === 'invoice') {
      await dismissInvoice.mutateAsync({
        accountId: target.accountId,
        month: target.month,
        body: { transactionId },
      });
      showUndoToast({
        message: 'Combinado: esse não é o pagamento.',
        onUndo: () =>
          restoreInvoice.mutate({
            accountId: target.accountId,
            month: target.month,
            transactionId,
          }),
      });
    }
  }

  return { link, dismiss, isPending };
}

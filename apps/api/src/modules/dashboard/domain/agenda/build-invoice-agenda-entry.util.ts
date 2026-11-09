import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import { computeInvoiceAgendaState } from '#/modules/dashboard/domain/agenda/compute-invoice-agenda-state.util.ts';
import { latestDate } from '#/modules/dashboard/domain/agenda/latest-date.util.ts';

// An invoice as an item of the agenda. A projected invoice (not open yet) and one with nothing to
// pay (a total of zero or a credit) are not items. Every invoice that is not paid counts in the
// Livre, whatever its due date (BR-DSH-003). What it still lacks (`remainingCents`) already comes
// without the presumed payment, which `invoices` works out.
export function buildInvoiceAgendaEntry(input: {
  accountName: string;
  invoice: Invoice.Dto;
}): AgendaEntry | null {
  const { invoice } = input;
  if (invoice.status === 'projected' || invoice.totalCents <= 0) return null;

  const isPaid = invoice.status === 'paid';
  const hasPresumed = invoice.presumedPaidCents > 0 && invoice.paymentSuggestion !== null;

  return {
    movesCash: true,
    carriedOver: false,
    item: {
      key: `invoice:${invoice.accountId}:${invoice.month}`,
      source: {
        type: 'invoice',
        billId: null,
        occurrenceId: null,
        recurrenceId: null,
        accountId: invoice.accountId,
        month: invoice.month,
      },
      flow: 'out',
      title: `Fatura ${input.accountName}`,
      badge: 'invoice',
      counterparty: null,
      accountId: invoice.accountId,
      categoryId: null,
      dueOn: invoice.dueOn,
      amountCents: invoice.totalCents,
      paidCents: invoice.paidCents,
      presumedPaidCents: invoice.presumedPaidCents,
      presumedTransactionId:
        hasPresumed && invoice.paymentSuggestion ? invoice.paymentSuggestion.transactionId : null,
      remainingCents: invoice.remainingCents,
      state: isPaid ? 'settled' : computeInvoiceAgendaState(invoice),
      invoiceState: invoice.status === 'open' ? 'open' : 'closed',
      settledOn: isPaid ? latestDate(invoice.payments.map((payment) => payment.paidOn)) : null,
      countsInFreeBalance: !isPaid,
      paymentFound: invoice.paymentSuggestion
        ? {
            transactionId: invoice.paymentSuggestion.transactionId,
            accountId: invoice.paymentSuggestion.accountId,
            amountCents: invoice.paymentSuggestion.amountCents,
            occurredOn: invoice.paymentSuggestion.occurredOn,
            description: invoice.paymentSuggestion.description,
          }
        : null,
    },
  };
}

import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InvoicePayment } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.type.ts';

import { closesOnFor } from '#mocks/invoices/invoice/closes-on-for.util.ts';
import { dueOnFor } from '#mocks/invoices/invoice/due-on-for.util.ts';
import { isMirrorCredit } from '#mocks/invoices/invoice/is-mirror-credit.util.ts';
import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

interface ComputedInvoice {
  dto: Invoice.Dto;
  items: Invoice.Item[];
}

function paidFromPayments(database: MockState.Database, payments: InvoicePayment.Dto[]): number {
  let paid = 0;
  for (const payment of payments) {
    if (!payment.transactionId) {
      paid += payment.amountCents;
      continue;
    }
    const tx = database.transactions.find((item) => item.id === payment.transactionId);
    if (tx && countsInAccounts(tx)) paid += Math.min(payment.amountCents, Math.abs(tx.amountCents));
  }

  return paid;
}

// The invoice of a card in a month, calculated from the transactions, the expected recurrences and
// the payments (invoices.md, "Regras de cálculo"). Nothing is stored for a month with no row.
export function computeInvoice(
  database: MockState.Database,
  accountId: string,
  month: string,
): ComputedInvoice {
  const account = database.accounts.find(
    (item) => item.id === accountId && item.type === 'credit_card',
  );
  if (!account?.creditCard) fail(404, 'CARD_NOT_FOUND', 'A conta não existe ou não é cartão');
  const card = account.creditCard;

  const row = database.invoices.find(
    (item) => item.accountId === accountId && item.month === month,
  );
  const closesOn = row?.closesOn ?? closesOnFor(card, month);
  const dueOn = row?.dueOn ?? dueOnFor(card, month);
  const openMonth = openMonthFor(card, TODAY);

  const transactions = database.transactions.filter(
    (tx) =>
      tx.accountId === accountId &&
      tx.invoiceMonth === month &&
      countsInAccounts(tx) &&
      tx.nature !== 'invoice_payment',
  );
  const purchasesCents = transactions
    .filter((tx) => !tx.installment)
    .reduce((sum, tx) => sum - tx.amountCents, 0);
  const installmentsCents = transactions
    .filter((tx) => tx.installment)
    .reduce((sum, tx) => sum - tx.amountCents, 0);

  // Expected expense recurrences on this card that fall in this invoice (open and future ones only).
  ensureOccurrences(database);
  const expectedRecurrences =
    month >= openMonth
      ? database.occurrences
          .map((record) => presentOccurrence(database, record))
          .filter((occurrence) => {
            const recurrence = database.recurrences.find(
              (item) => item.id === occurrence.recurrenceId,
            );
            if (recurrence?.kind !== 'expense' || recurrence.accountId !== accountId) return false;
            if (recurrence.archivedAt || recurrence.pausedAt) return false;
            if (!['expected', 'partial', 'late'].includes(occurrence.status)) return false;

            return (
              invoiceMonthFor(
                card.closingDay,
                occurrence.expectedOn ?? `${occurrence.month}-01`,
              ) === month
            );
          })
      : [];
  const expectedRecurringCents = expectedRecurrences.reduce(
    (sum, occurrence) => sum + occurrence.remainingCents,
    0,
  );

  const computedTotalCents = purchasesCents + installmentsCents + expectedRecurringCents;
  const bankTotalCents = row?.bankTotalCents ?? null;
  const totalOverrideCents = row?.totalOverrideCents ?? null;
  const totalCents = totalOverrideCents ?? bankTotalCents ?? computedTotalCents;

  // Same day: the order they were made in (the row keeps them in creation order), then the id.
  const payments = (row?.payments ?? [])
    .map((payment, index) => ({ payment, index }))
    .sort(
      (a, b) =>
        a.payment.paidOn.localeCompare(b.payment.paidOn) ||
        a.index - b.index ||
        a.payment.id.localeCompare(b.payment.id),
    )
    .map(({ payment }) => payment);
  const paidCents = paidFromPayments(database, payments);

  let status: Invoice.Status;
  if (month > openMonth) status = 'projected';
  else if (paidCents >= totalCents && (paidCents > 0 || TODAY > closesOn)) status = 'paid';
  else if (TODAY > dueOn) status = 'overdue';
  else if (paidCents > 0) status = 'partial';
  else if (TODAY > closesOn) status = 'closed';
  else status = 'open';

  // "Pagamento encontrado": an invoice_payment outflow of another account, near what is left.
  let paymentSuggestion: Invoice.PaymentSuggestion | null = null;
  const leftBeforePresumed = Math.max(0, totalCents - paidCents);
  if (['closed', 'partial', 'overdue'].includes(status) && leftBeforePresumed > 0) {
    const mirrorCredits = database.transactions.filter(
      (tx) =>
        tx.accountId === accountId &&
        tx.nature === 'invoice_payment' &&
        tx.amountCents > 0 &&
        countsInAccounts(tx),
    );
    const candidates = database.transactions
      .filter((tx) => {
        const txAccount = database.accounts.find((item) => item.id === tx.accountId);

        return (
          tx.nature === 'invoice_payment' &&
          tx.amountCents < 0 &&
          txAccount?.type !== 'credit_card' &&
          tx.method !== 'credit' &&
          countsInAccounts(tx) &&
          tx.occurredOn >= closesOn &&
          tx.occurredOn <= addDays(dueOn, 5) &&
          !isTransactionLinked(database, tx.id) &&
          !(row?.dismissedTransactionIds ?? []).includes(tx.id)
        );
      })
      .map((tx) => ({
        tx,
        hasMirror: mirrorCredits.some((credit) => isMirrorCredit(tx, credit)),
        difference: Math.abs(Math.abs(tx.amountCents) - leftBeforePresumed),
      }))
      .filter((entry) => entry.hasMirror || entry.difference <= 100)
      .sort(
        (a, b) =>
          a.difference - b.difference ||
          b.tx.occurredOn.localeCompare(a.tx.occurredOn) ||
          b.tx.id.localeCompare(a.tx.id),
      );
    const best = candidates[0];
    if (best) {
      paymentSuggestion = {
        transactionId: best.tx.id,
        accountId: best.tx.accountId,
        amountCents: best.tx.amountCents,
        occurredOn: best.tx.occurredOn,
        description: best.tx.description,
        isPresumed: best.hasMirror || candidates.length === 1,
      };
    }
  }

  // The whole value of the transaction counts as presumed paid; what is left never goes below 0.
  const presumedPaidCents = paymentSuggestion?.isPresumed
    ? Math.abs(paymentSuggestion.amountCents)
    : 0;

  const dto: Invoice.Dto = {
    accountId,
    month,
    closesOn,
    dueOn,
    status,
    breakdown: { purchasesCents, installmentsCents, expectedRecurringCents },
    computedTotalCents,
    bankTotalCents,
    totalOverrideCents,
    overrideNote: row?.overrideNote ?? null,
    totalCents,
    paidCents,
    presumedPaidCents,
    remainingCents: Math.max(0, totalCents - paidCents - presumedPaidCents),
    payments,
    paymentSuggestion,
    isEditable: status !== 'projected',
    paidBeforeFincheck: false,
  };

  const items: Invoice.Item[] = [
    ...transactions.map((tx): Invoice.Item => ({
      type: 'transaction',
      transactionId: tx.id,
      description: tx.description,
      occurredOn: tx.occurredOn,
      amountCents: tx.amountCents,
      // A split transaction has its categories on its parts.
      categoryId: tx.splits.length > 0 ? null : tx.categoryId,
      installment: tx.installment
        ? { number: tx.installment.number, count: tx.installment.count }
        : null,
    })),
    ...expectedRecurrences.map((occurrence): Invoice.Item => ({
      type: 'expected_recurrence',
      occurrenceId: occurrence.id,
      recurrenceName: occurrence.recurrenceName,
      expectedOn: occurrence.expectedOn,
      amountCents: occurrence.remainingCents,
    })),
  ].sort((a, b) => {
    const dateA = a.type === 'transaction' ? a.occurredOn : (a.expectedOn ?? '');
    const dateB = b.type === 'transaction' ? b.occurredOn : (b.expectedOn ?? '');
    if (dateA === '' && dateB !== '') return 1;
    if (dateB === '' && dateA !== '') return -1;

    const idA = a.type === 'transaction' ? a.transactionId : a.occurrenceId;
    const idB = b.type === 'transaction' ? b.transactionId : b.occurrenceId;

    return dateB.localeCompare(dateA) || idB.localeCompare(idA);
  });

  return { dto, items };
}

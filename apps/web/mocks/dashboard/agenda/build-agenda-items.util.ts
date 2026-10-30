import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import { findPresumedBillPayment } from '#mocks/bills/bill/find-presumed-bill-payment.util.ts';
import { presentBill } from '#mocks/bills/bill/present-bill.util.ts';
import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/clock.constant.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';

const END_OF_CURRENT_MONTH = `${CURRENT_MONTH}-${String(daysInMonth(CURRENT_MONTH)).padStart(2, '0')}`;

function lastDate(dates: string[]): string | null {
  return dates.length === 0
    ? null
    : dates.reduce((latest, date) => (date > latest ? date : latest));
}

function invoiceItems(database: MockState.Database, month: string): Agenda.Item[] {
  const items: Agenda.Item[] = [];

  for (const account of database.accounts) {
    if (account.type !== 'credit_card' || account.archivedAt || !account.creditCard) continue;
    const openMonth = openMonthFor(account.creditCard, TODAY);

    for (let back = 3; back >= 0; back -= 1) {
      const invoiceMonth = addMonths(openMonth, -back);
      const invoice = computeInvoice(database, account.id, invoiceMonth).dto;
      const settledOn = lastDate(invoice.payments.map((payment) => payment.paidOn));
      const isPaid = invoice.status === 'paid';
      if (
        isPaid &&
        (invoice.totalCents <= 0 || settledOn === null || settledOn.slice(0, 7) !== month)
      )
        continue;

      const suggestion = invoice.paymentSuggestion;
      items.push({
        key: `invoice:${account.id}:${invoiceMonth}`,
        source: {
          type: 'invoice',
          billId: null,
          occurrenceId: null,
          recurrenceId: null,
          accountId: account.id,
          month: invoiceMonth,
        },
        flow: 'out',
        title: `Fatura ${account.name}`,
        badge: 'invoice',
        counterparty: null,
        accountId: account.id,
        categoryId: null,
        dueOn: invoice.dueOn,
        amountCents: invoice.totalCents,
        paidCents: invoice.paidCents,
        presumedPaidCents: invoice.presumedPaidCents,
        presumedTransactionId:
          invoice.presumedPaidCents > 0 ? (suggestion?.transactionId ?? null) : null,
        remainingCents: invoice.remainingCents,
        state: isPaid
          ? 'settled'
          : invoice.status === 'overdue'
            ? 'overdue'
            : invoice.status === 'partial'
              ? 'partial'
              : 'upcoming',
        invoiceState: invoice.status === 'open' ? 'open' : 'closed',
        settledOn: isPaid ? settledOn : null,
        countsInFreeBalance: !isPaid,
        paymentFound: suggestion
          ? {
              transactionId: suggestion.transactionId,
              accountId: suggestion.accountId,
              amountCents: suggestion.amountCents,
              occurredOn: suggestion.occurredOn,
            }
          : null,
      });
    }
  }

  return items;
}

function billItems(database: MockState.Database): Agenda.Item[] {
  return database.bills.map((record) => {
    const bill = presentBill(database, record);
    const presumed = findPresumedBillPayment(database, record);
    const presumedPaidCents = presumed
      ? Math.min(Math.abs(presumed.amountCents), bill.remainingCents)
      : 0;
    const settled = bill.status === 'settled';
    const friendReceivable = bill.kind === 'friend' && bill.direction === 'receivable';
    const dueInTime = bill.dueOn !== null && bill.dueOn <= END_OF_CURRENT_MONTH;

    return {
      key: `bill:${bill.id}`,
      source: {
        type: 'bill',
        billId: bill.id,
        occurrenceId: null,
        recurrenceId: null,
        accountId: null,
        month: null,
      },
      flow: bill.direction === 'payable' ? 'out' : 'in',
      title:
        bill.counterparty && bill.kind === 'friend'
          ? `${bill.counterparty}, ${bill.description.toLowerCase()}`
          : bill.description,
      badge: friendReceivable ? 'friend_receivable' : bill.kind === 'friend' ? 'debt' : 'bill',
      counterparty: bill.counterparty,
      accountId: null,
      categoryId: bill.categoryId,
      dueOn: bill.dueOn,
      amountCents: bill.amountCents,
      paidCents: bill.paidCents,
      presumedPaidCents,
      presumedTransactionId: presumed?.id ?? null,
      remainingCents: Math.max(0, bill.remainingCents - presumedPaidCents),
      state: settled
        ? 'settled'
        : bill.status === 'overdue'
          ? 'overdue'
          : bill.status === 'partial'
            ? 'partial'
            : 'upcoming',
      invoiceState: null,
      settledOn: settled ? lastDate(bill.payments.map((payment) => payment.paidOn)) : null,
      countsInFreeBalance: !settled && !friendReceivable && dueInTime,
      paymentFound: null,
    } satisfies Agenda.Item;
  });
}

function occurrenceItems(database: MockState.Database, month: string): Agenda.Item[] {
  return listMonthOccurrences(database, month)
    .filter((occurrence) => occurrence.status !== 'skipped')
    .map((occurrence) => {
      const recurrence = database.recurrences.find((item) => item.id === occurrence.recurrenceId);
      const account = database.accounts.find((item) => item.id === occurrence.accountId);
      const settled = occurrence.status === 'confirmed';
      const onCard = occurrence.kind === 'expense' && account?.type === 'credit_card';

      return {
        key: `occurrence:${occurrence.id}`,
        source: {
          type: 'occurrence',
          billId: null,
          occurrenceId: occurrence.id,
          recurrenceId: occurrence.recurrenceId,
          accountId: occurrence.accountId,
          month: null,
        },
        flow: occurrence.kind === 'income' ? 'in' : 'out',
        title: occurrence.recurrenceName,
        badge: 'recurring',
        counterparty: recurrence?.counterparty ?? null,
        accountId: occurrence.accountId,
        categoryId: recurrence?.categoryId ?? null,
        dueOn: occurrence.expectedOn,
        amountCents: occurrence.expectedAmountCents,
        paidCents: occurrence.receivedCents,
        presumedPaidCents: 0,
        presumedTransactionId: null,
        remainingCents: occurrence.remainingCents,
        state: settled
          ? 'settled'
          : occurrence.status === 'late'
            ? 'overdue'
            : occurrence.status === 'partial'
              ? 'partial'
              : 'upcoming',
        invoiceState: null,
        settledOn: settled
          ? (lastDate(occurrence.payments.map((payment) => payment.occurredOn)) ??
            occurrence.settledAt?.slice(0, 10) ??
            occurrence.expectedOn)
          : null,
        countsInFreeBalance: !settled && !onCard && occurrence.remainingCents > 0,
        paymentFound: null,
      } satisfies Agenda.Item;
    });
}

// Everything that comes in or goes out around a month: invoices, bills and recurrence occurrences,
// in the one shape that the Livre, the timeline and the agenda share.
export function buildAgendaItems(database: MockState.Database, month: string): Agenda.Item[] {
  return [
    ...invoiceItems(database, month),
    ...billItems(database),
    ...occurrenceItems(database, month),
  ];
}

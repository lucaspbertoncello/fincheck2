import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { findPresumedBillPayment } from '#mocks/bills/bill/find-presumed-bill-payment.util.ts';
import { presentBill } from '#mocks/bills/bill/present-bill.util.ts';
import type { AgendaEntry } from '#mocks/dashboard/agenda/agenda-entry.type.ts';
import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';

function lastDate(dates: string[]): string | null {
  return dates.length === 0
    ? null
    : dates.reduce((latest, date) => (date > latest ? date : latest));
}

function hasInvoiceActivity(
  database: MockState.Database,
  accountId: string,
  month: string,
): boolean {
  return (
    database.invoices.some((row) => row.accountId === accountId && row.month === month) ||
    database.transactions.some((tx) => tx.accountId === accountId && tx.invoiceMonth === month)
  );
}

// Overdue and partial only while something is left to pay: an invoice that the presumed payment
// covers whole is waiting for the link, not late.
function computeInvoiceState(invoice: Invoice.Dto): Agenda.Item['state'] {
  if (invoice.status === 'paid') return 'settled';
  if (invoice.remainingCents <= 0) return 'upcoming';
  if (invoice.status === 'overdue') return 'overdue';
  if (invoice.status === 'partial') return 'partial';

  return 'upcoming';
}

function buildInvoiceEntry(account: MockState.AccountRecord, invoice: Invoice.Dto) {
  if (invoice.status === 'projected' || invoice.totalCents <= 0) return null;

  const isPaid = invoice.status === 'paid';
  const suggestion = invoice.paymentSuggestion;

  return {
    movesCash: true,
    carriedOver: false,
    item: {
      key: `invoice:${account.id}:${invoice.month}`,
      source: {
        type: 'invoice',
        billId: null,
        occurrenceId: null,
        recurrenceId: null,
        accountId: account.id,
        month: invoice.month,
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
      state: computeInvoiceState(invoice),
      invoiceState: invoice.status === 'open' ? 'open' : 'closed',
      settledOn: isPaid ? lastDate(invoice.payments.map((payment) => payment.paidOn)) : null,
      countsInFreeBalance: !isPaid,
      paymentFound: suggestion
        ? {
            transactionId: suggestion.transactionId,
            accountId: suggestion.accountId,
            amountCents: suggestion.amountCents,
            occurredOn: suggestion.occurredOn,
            description: suggestion.description,
          }
        : null,
    },
  } satisfies AgendaEntry;
}

// Every invoice of an active card not paid (the open one and the last three before it that have a
// row or a transaction), whatever its due date; with `withSettled`, also the paid ones whose last
// payment is in `month` (invoices of the 3 months before it and the one after). A projected one and
// one with nothing to pay are not items.
function listInvoiceEntries(
  database: MockState.Database,
  month: string,
  withSettled: boolean,
): AgendaEntry[] {
  const entries: AgendaEntry[] = [];

  for (const account of database.accounts) {
    if (account.type !== 'credit_card' || account.archivedAt || !account.creditCard) continue;
    const openMonth = openMonthFor(account.creditCard, TODAY);
    const unpaidMonths = [-3, -2, -1, 0]
      .map((back) => addMonths(openMonth, back))
      .filter(
        (invoiceMonth) =>
          invoiceMonth === openMonth || hasInvoiceActivity(database, account.id, invoiceMonth),
      );

    for (const invoiceMonth of unpaidMonths) {
      const invoice = computeInvoice(database, account.id, invoiceMonth).dto;
      if (invoice.status === 'paid') continue;
      const entry = buildInvoiceEntry(account, invoice);
      if (entry) entries.push(entry);
    }

    if (!withSettled) continue;
    for (const back of [-3, -2, -1, 0, 1]) {
      const invoiceMonth = addMonths(month, back);
      if (!hasInvoiceActivity(database, account.id, invoiceMonth)) continue;
      const invoice = computeInvoice(database, account.id, invoiceMonth).dto;
      const paidOn = lastDate(invoice.payments.map((payment) => payment.paidOn));
      if (invoice.status !== 'paid' || paidOn?.slice(0, 7) !== month) continue;
      const entry = buildInvoiceEntry(account, invoice);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

// Overdue and partial only while something is left to pay: a bill that the presumed payment covers
// whole is waiting for the link, not late.
function computeBillState(status: string, remainingCents: number): Agenda.Item['state'] {
  if (status === 'settled') return 'settled';
  if (remainingCents <= 0) return 'upcoming';
  if (status === 'overdue') return 'overdue';
  if (status === 'partial') return 'partial';

  return 'upcoming';
}

function listBillEntries(database: MockState.Database): AgendaEntry[] {
  const livreEndOn = dateInMonth(CURRENT_MONTH, 31);

  return database.bills.map((record) => {
    const bill = presentBill(database, record);
    const presumed = findPresumedBillPayment(database, record);
    const settled = bill.status === 'settled';
    const presumedPaidCents =
      presumed && !settled ? Math.min(Math.abs(presumed.amountCents), bill.remainingCents) : 0;
    const remainingCents = Math.max(0, bill.remainingCents - presumedPaidCents);
    const friendReceivable = bill.kind === 'friend' && bill.direction === 'receivable';

    return {
      movesCash: !friendReceivable,
      carriedOver: false,
      item: {
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
            ? bill.direction === 'payable'
              ? `Você deve a ${bill.counterparty}`
              : `${bill.counterparty} te deve`
            : bill.description,
        badge: friendReceivable ? 'friend_receivable' : bill.kind === 'friend' ? 'debt' : 'bill',
        counterparty: bill.counterparty,
        accountId: null,
        categoryId: bill.categoryId,
        dueOn: bill.dueOn,
        amountCents: bill.amountCents,
        paidCents: bill.paidCents,
        presumedPaidCents,
        presumedTransactionId: presumedPaidCents > 0 && presumed ? presumed.id : null,
        remainingCents,
        state: computeBillState(bill.status, remainingCents),
        invoiceState: null,
        settledOn: settled ? lastDate(bill.payments.map((payment) => payment.paidOn)) : null,
        countsInFreeBalance:
          !settled && !friendReceivable && bill.dueOn !== null && bill.dueOn <= livreEndOn,
        paymentFound: null,
      } satisfies Agenda.Item,
    };
  });
}

function buildOccurrenceEntry(
  database: MockState.Database,
  occurrence: Occurrence.Dto,
  isDueInLivre: boolean,
): AgendaEntry | null {
  if (occurrence.status === 'skipped') return null;

  const recurrence = database.recurrences.find((item) => item.id === occurrence.recurrenceId);
  const account = database.accounts.find((item) => item.id === occurrence.accountId);
  const settled = occurrence.status === 'confirmed';
  const onCard = occurrence.kind === 'expense' && account?.type === 'credit_card';
  const inLivreMonth = occurrence.month === CURRENT_MONTH || occurrence.carriedOver || isDueInLivre;

  return {
    movesCash: !onCard,
    carriedOver: occurrence.carriedOver,
    item: {
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
          occurrence.expectedOn ??
          occurrence.windowEndOn)
        : null,
      countsInFreeBalance:
        !settled &&
        !onCard &&
        !recurrence?.pausedAt &&
        inLivreMonth &&
        occurrence.remainingCents > 0,
      paymentFound: null,
    },
  };
}

// The occurrences of the month and the ones of its neighbours that matter: in the month of the
// Livre, the open ones of the months around that fall due by its last day; with `withSettled`, the
// confirmed ones of the 3 months before and of the one after (they may have been paid in the month).
function listOccurrenceEntries(
  database: MockState.Database,
  month: string,
  withSettled: boolean,
): AgendaEntry[] {
  const own = listMonthOccurrences(database, month);
  const seen = new Set(own.map((occurrence) => occurrence.id));
  const presentMonths = (months: string[]) =>
    database.occurrences
      .filter((record) => months.includes(record.month) && !seen.has(record.id))
      .map((record) => presentOccurrence(database, record));
  const entries = own.flatMap(
    (occurrence) => buildOccurrenceEntry(database, occurrence, false) ?? [],
  );

  if (month === CURRENT_MONTH) {
    const livreEndOn = dateInMonth(CURRENT_MONTH, 31);
    for (const occurrence of presentMonths([addMonths(month, -1), addMonths(month, 1)])) {
      const recurrence = database.recurrences.find((item) => item.id === occurrence.recurrenceId);
      if (!recurrence || recurrence.pausedAt || recurrence.archivedAt) continue;
      if (!['expected', 'partial', 'late'].includes(occurrence.status)) continue;
      if (occurrence.expectedOn === null || occurrence.expectedOn > livreEndOn) continue;
      seen.add(occurrence.id);
      const entry = buildOccurrenceEntry(database, occurrence, true);
      if (entry) entries.push(entry);
    }
  }

  if (withSettled) {
    for (const occurrence of presentMonths([-3, -2, -1, 1].map((back) => addMonths(month, back)))) {
      if (occurrence.status !== 'confirmed' || seen.has(occurrence.id)) continue;
      seen.add(occurrence.id);
      const entry = buildOccurrenceEntry(database, occurrence, false);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}

// Everything that comes in or goes out around a month: invoices, bills and recurrence occurrences,
// in the one shape that the Livre, the timeline and the agenda share. `withSettled` also brings
// what was paid in the month, the invoices and occurrences of other months included.
export function buildAgendaEntries(
  database: MockState.Database,
  month: string,
  options: { withSettled?: boolean } = {},
): AgendaEntry[] {
  const withSettled = options.withSettled ?? false;

  return [
    ...listInvoiceEntries(database, month, withSettled),
    ...listBillEntries(database),
    ...listOccurrenceEntries(database, month, withSettled),
  ];
}

export function buildAgendaItems(
  database: MockState.Database,
  month: string,
  options: { withSettled?: boolean } = {},
): Agenda.Item[] {
  return buildAgendaEntries(database, month, options).map((entry) => entry.item);
}

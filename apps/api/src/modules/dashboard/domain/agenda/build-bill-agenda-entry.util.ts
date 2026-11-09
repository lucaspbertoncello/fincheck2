import type { AgendaBill } from '#/modules/dashboard/domain/agenda/agenda-bill.type.ts';
import type { AgendaEntry } from '#/modules/dashboard/domain/agenda/agenda-entry.type.ts';
import { computeBillAgendaState } from '#/modules/dashboard/domain/agenda/compute-bill-agenda-state.util.ts';
import { latestDate } from '#/modules/dashboard/domain/agenda/latest-date.util.ts';

// A bill (to pay or to receive, general or a debt with a friend) as an item of the agenda. The
// presumed payment (a transaction that most likely paid it and has no link yet) takes out of what
// the bill lacks the value of that transaction, at most what is left: the money already left the
// balance, so counting the bill in full would count it twice. It counts in the Livre when it is
// not settled, is not a friend's debt to Lucas (it is not income, BR-BIL-005), has a due day and
// that day is on or before the end of the month of the Livre (`livreEndOn`); an overdue one always
// is.
export function buildBillAgendaEntry(input: {
  entry: AgendaBill;
  livreEndOn: string;
}): AgendaEntry {
  const { bill, presumed } = input.entry;
  const isSettled = bill.status === 'settled';
  const isFriend = bill.kind === 'friend' && bill.counterparty !== null;
  const isFriendReceivable = bill.kind === 'friend' && bill.direction === 'receivable';
  const presumedPaidCents =
    presumed && !isSettled ? Math.min(Math.abs(presumed.amountCents), bill.remainingCents) : 0;
  const remainingCents = Math.max(0, bill.remainingCents - presumedPaidCents);

  return {
    movesCash: !isFriendReceivable,
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
      title: isFriend
        ? bill.direction === 'payable'
          ? `Você deve a ${bill.counterparty}`
          : `${bill.counterparty} te deve`
        : bill.description,
      badge: isFriendReceivable ? 'friend_receivable' : bill.kind === 'friend' ? 'debt' : 'bill',
      counterparty: bill.counterparty,
      accountId: null,
      categoryId: bill.categoryId,
      dueOn: bill.dueOn,
      amountCents: bill.amountCents,
      paidCents: bill.paidCents,
      presumedPaidCents,
      presumedTransactionId: presumedPaidCents > 0 && presumed ? presumed.transactionId : null,
      remainingCents,
      state: computeBillAgendaState(bill.status, remainingCents),
      invoiceState: null,
      settledOn: isSettled ? latestDate(bill.payments.map((payment) => payment.paidOn)) : null,
      countsInFreeBalance:
        !isSettled && !isFriendReceivable && bill.dueOn !== null && bill.dueOn <= input.livreEndOn,
      paymentFound: null,
    },
  };
}

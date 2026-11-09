import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import { matchesCounterparty } from '#mocks/bills/bill/matches-counterparty.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

// The Pix that could be tied to a bill (or to a debt about to be created): right direction, whole,
// not a credit card purchase (the invoice pays it), not tied to anything yet nor dismissed, from the
// last 90 days up to today, at most 30; the ones whose sender has the person's name first.
export function listPaymentCandidates(
  database: MockState.Database,
  direction: Bill.Direction,
  counterparty: string | null,
  dismissedTransactionIds: string[] = [],
): Bill.PaymentCandidateDto[] {
  const since = addDays(TODAY, -90);
  const similar = (tx: MockState.TransactionRecord) => matchesCounterparty(counterparty, tx);

  return database.transactions
    .filter(
      (tx) =>
        countsInAccounts(tx) &&
        tx.splits.length === 0 &&
        tx.method !== 'credit' &&
        tx.occurredOn >= since &&
        tx.occurredOn <= TODAY &&
        !dismissedTransactionIds.includes(tx.id) &&
        !isTransactionLinked(database, tx.id) &&
        (direction === 'payable'
          ? tx.amountCents < 0 && tx.nature === 'expense'
          : tx.amountCents > 0 && tx.nature === 'income'),
    )
    .sort(
      (a, b) =>
        Number(similar(b)) - Number(similar(a)) ||
        b.occurredOn.localeCompare(a.occurredOn) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 30)
    .map((tx) => ({
      transactionId: tx.id,
      description: tx.description,
      occurredOn: tx.occurredOn,
      amountCents: tx.amountCents,
      accountId: tx.accountId,
      counterparty: tx.bank?.counterparty ?? null,
    }));
}

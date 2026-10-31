import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

// The Pix that could be tied to a bill (or to a debt about to be created): right direction, not
// tied to anything yet, last 90 days, at most 30; the ones whose sender looks like the person first.
export function listPaymentCandidates(
  database: MockState.Database,
  direction: Bill.Direction,
  counterparty: string | null,
): Bill.PaymentCandidateDto[] {
  const person = counterparty ? normalizeText(counterparty) : null;
  const since = addDays(TODAY, -90);
  const similar = (tx: MockState.TransactionRecord) =>
    person !== null &&
    normalizeText(`${tx.bank?.counterparty ?? ''} ${tx.bank?.description ?? ''}`).includes(person);

  return database.transactions
    .filter(
      (tx) =>
        countsInAccounts(tx) &&
        tx.occurredOn >= since &&
        !isTransactionLinked(database, tx.id) &&
        (direction === 'payable'
          ? tx.amountCents < 0 && tx.nature === 'expense'
          : tx.amountCents > 0 && tx.nature === 'income'),
    )
    .sort(
      (a, b) => Number(similar(b)) - Number(similar(a)) || b.occurredOn.localeCompare(a.occurredOn),
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

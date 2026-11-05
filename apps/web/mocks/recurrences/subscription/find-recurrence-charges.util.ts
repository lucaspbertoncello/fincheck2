import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// The card charges of a recurrence: the ones linked to its occurrences plus the ones on its card
// whose description carries its match text (or its name). Oldest first.
export function findRecurrenceCharges(
  database: MockState.Database,
  recurrence: MockState.RecurrenceRecord,
): MockState.TransactionRecord[] {
  const pattern = recurrence.matchText ?? normalizeText(recurrence.name);
  const linkedIds = new Set(
    database.occurrences
      .filter((occurrence) => occurrence.recurrenceId === recurrence.id)
      .flatMap((occurrence) => occurrence.payments.map((payment) => payment.transactionId)),
  );

  return database.transactions
    .filter(
      (tx) =>
        countsInAccounts(tx) &&
        tx.amountCents < 0 &&
        (linkedIds.has(tx.id) ||
          (tx.accountId === recurrence.accountId &&
            tx.method === 'credit' &&
            normalizeText(tx.description).includes(pattern))),
    )
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
}

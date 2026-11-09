import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import { containsAsWords } from '#mocks/recurrences/subscription/contains-as-words.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// How far back the charges of a subscription are read by text to find its last one.
const MONTHS_LOOKED_BACK = 13;

// The charges of a recurrence up to the end of `month`, oldest first: the debits linked to its
// occurrences, plus the expenses on its account, by its method (the card when it has none), that
// carry its match text (or its name) as a whole word, read 13 months back from the month asked.
export function findRecurrenceCharges(
  database: MockState.Database,
  recurrence: MockState.RecurrenceRecord,
  month: string,
): MockState.TransactionRecord[] {
  const pattern = recurrence.matchText ?? normalizeText(recurrence.name);
  const monthEnd = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const textFrom = `${addMonths(month, -MONTHS_LOOKED_BACK)}-01`;
  const linkedIds = new Set(
    database.occurrences
      .filter((occurrence) => occurrence.recurrenceId === recurrence.id)
      .flatMap((occurrence) => occurrence.payments.map((payment) => payment.transactionId)),
  );

  return database.transactions
    .filter((tx) => {
      if (!countsInAccounts(tx) || tx.amountCents >= 0 || tx.occurredOn > monthEnd) return false;
      if (linkedIds.has(tx.id)) return true;

      return (
        tx.nature === 'expense' &&
        tx.occurredOn >= textFrom &&
        tx.accountId === recurrence.accountId &&
        tx.method === (recurrence.method ?? 'credit') &&
        containsAsWords(normalizeText(tx.description), pattern)
      );
    })
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id));
}

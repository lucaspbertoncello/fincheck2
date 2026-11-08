import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { OccurrenceTransactionKindMismatchError } from '#/modules/recurrences/domain/occurrence-payment/occurrence-transaction-kind-mismatch.error.ts';

// An income occurrence takes a credit of nature `income`, an expense one a debit of nature
// `expense`, and only a transaction that counts (not ignored, not removed by the bank without an
// edit). A transfer, a payment of invoice, a debt or an adjustment pays no occurrence.
export function assertTransactionCanPayOccurrence(input: {
  kind: Recurrence.Kind;
  // With sign.
  amountCents: number;
  nature: string;
  counts: boolean;
}): void {
  const rightWay =
    input.kind === 'income'
      ? input.amountCents > 0 && input.nature === 'income'
      : input.amountCents < 0 && input.nature === 'expense';

  if (!rightWay || !input.counts) throw new OccurrenceTransactionKindMismatchError();
}

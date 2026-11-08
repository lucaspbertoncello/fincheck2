import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the occurrences of a recurrence a transaction in review could pay (the allowance and the
// meal voucher, BR-REC-012). The owner is `recurrences`, which applies the rule of the automatic
// match; the ones that already pay an occurrence get none.
export interface RecurrenceCandidateReader {
  candidatesFor(
    items: RecurrenceCandidateReader.Item[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, ReviewQueue.ItemDto['recurrenceCandidates']>>;
}

export namespace RecurrenceCandidateReader {
  export type Item = {
    transactionId: string;
    // The day of the transaction: the window of an occurrence has to hold it.
    occurredOn: string;
    // Sender and description, normalized.
    text: string;
    // Positive, the value the occurrence would receive.
    amountCents: number;
    kind: 'expense' | 'income';
  };
}

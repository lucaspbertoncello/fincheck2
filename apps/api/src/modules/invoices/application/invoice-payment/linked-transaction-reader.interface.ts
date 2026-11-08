import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions that already settle something else: an occurrence of a recurrence and,
// when it exists, a bill. A transaction pays one thing only, so one of these cannot also pay an
// invoice, and is not offered as the payment found. The owners are `recurrences` and `bills`.
export interface LinkedTransactionReader {
  // Which of the transactions are already tied to what the owner keeps.
  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>>;
}

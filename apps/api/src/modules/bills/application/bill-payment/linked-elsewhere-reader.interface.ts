import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions that already settle something that is not a bill: an invoice or an
// occurrence of a recurrence. A transaction pays one thing only, so one of these cannot pay a bill
// and is not offered as a candidate. The owners are `invoices` and `recurrences`.
export interface LinkedElsewhereReader {
  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>>;
}

import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions that already settle something that is not an occurrence: a bill (its
// payment or its origin). A transaction pays one thing only, so one of these is not offered to an
// occurrence and cannot be linked to one. The owner is `bills`.
export interface LinkedElsewhereReader {
  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>>;
}

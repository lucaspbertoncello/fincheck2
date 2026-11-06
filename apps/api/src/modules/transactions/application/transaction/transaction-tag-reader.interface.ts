import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';

// Port to the tags a transaction takes. The owner is `categories` (not built yet: the `main` leaves
// it unwired and the use cases refuse a tag until it is). It throws its own `TAG_NOT_FOUND` when an
// id does not exist; an archived one is returned as such. The answer keeps the order of the ids.
export interface TransactionTagReader {
  requireTags(tagIds: string[], executor?: Kysely<Database>): Promise<Transaction.TagRef[]>;
}

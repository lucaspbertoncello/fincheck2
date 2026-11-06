import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';

// Port to the account a transaction lives in. The owner is `accounts`, which throws its own
// `ACCOUNT_NOT_FOUND` when the id does not exist.
export interface TransactionAccountReader {
  requireAccount(accountId: string, executor?: Kysely<Database>): Promise<Transaction.AccountRef>;
}

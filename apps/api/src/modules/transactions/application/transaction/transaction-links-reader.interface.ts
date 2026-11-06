import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what a transaction pays: an occurrence of a recurrence, a bill or debt, an invoice. The
// owners are `recurrences`, `bills` and `invoices` (not built yet: unwired in the `main`, every
// transaction has no link, which is the truth while they do not exist). A transaction without any
// link may be absent from the map.
export interface TransactionLinksReader {
  linksOf(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, TransactionContract.LinksDto>>;
}

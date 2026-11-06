import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what the deletion of an account takes from `transactions` (the count shown before).
export interface AccountTransactionsReader {
  countsOf(
    accountId: string,
    executor?: Kysely<Database>,
  ): Promise<AccountTransactionsReader.Counts>;
}

export namespace AccountTransactionsReader {
  export type Counts = {
    // All the account's transactions, the ignored ones too.
    transactionCount: number;
    installmentPlanCount: number;
  };
}

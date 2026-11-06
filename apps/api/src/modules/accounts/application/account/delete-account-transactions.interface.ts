import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the use case of `transactions` that deletes the installment plans and the transactions
// of an account. The other leg of a transfer goes back to expense or income by its sign, and the
// payment links fall by `ON DELETE CASCADE`. Runs inside the unit of work of the deletion.
export interface DeleteAccountTransactions {
  execute(accountId: string, executor: Kysely<Database>): Promise<void>;
}

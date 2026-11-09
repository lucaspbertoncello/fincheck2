import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// How many transactions the bank brought to each account, for "1.204 transações" of the first
// connection (BR-SYN-005). Counts only what came from the bank and was not taken back: a parcel the
// plan generated is not one. The sync asks it through its own port, which this class satisfies.
export class CountBankTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(accountIds: string[], executor: Kysely<Database> = this.db): Promise<number> {
    if (accountIds.length === 0) return 0;

    const row = await executor
      .selectFrom('transactions')
      .select((builder) => builder.fn.countAll<number>().as('total'))
      .where('account_id', 'in', accountIds)
      .where('origin', '=', 'bank')
      .executeTakeFirst();

    return Number(row?.total ?? 0);
  }
}

import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What deleting an account takes from `transactions`, to show before: every transaction of the
// account, the ignored ones too, and its installment plans. `accounts` asks it through its
// `AccountTransactionsReader`, which this class satisfies.
export class CountAccountTransactionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async countsOf(
    accountId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<{ transactionCount: number; installmentPlanCount: number }> {
    const [transactions, plans] = await Promise.all([
      executor
        .selectFrom('transactions')
        .select(sql<number>`count(*)`.as('total'))
        .where('account_id', '=', accountId)
        .executeTakeFirstOrThrow(),
      executor
        .selectFrom('installment_plans')
        .select(sql<number>`count(*)`.as('total'))
        .where('account_id', '=', accountId)
        .executeTakeFirstOrThrow(),
    ]);

    return {
      transactionCount: Number(transactions.total),
      installmentPlanCount: Number(plans.total),
    };
  }
}

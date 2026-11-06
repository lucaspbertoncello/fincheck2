import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The balance of a manual account or wallet (BR-ACC-006): the sum of its transactions that enter
// the accounts and are dated up to today, of every nature (the adjustment is a transaction).
// `accounts` asks it through its `ManualBalanceReader`, which this class satisfies.
export class GetAccountBalancesQuery {
  private readonly db: Kysely<Database>;
  private readonly clock: Clock;

  constructor(db: Kysely<Database>, clock: Clock) {
    this.db = db;
    this.clock = clock;
  }

  // Cents by account id; an account with no transaction is 0.
  async balancesOf(
    accountIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, number>> {
    const balances = new Map(accountIds.map((accountId) => [accountId, 0]));
    if (accountIds.length === 0) return balances;

    const rows = await executor
      .selectFrom('transactions as t')
      .select(['t.account_id', sql<number>`sum(t.amount_cents)`.as('balance_cents')])
      .where('t.account_id', 'in', accountIds)
      .where('t.occurred_on', '<=', this.clock.today().value)
      .where(entersAccountsSql('t'))
      .groupBy('t.account_id')
      .execute();
    for (const row of rows) balances.set(row.account_id, Number(row.balance_cents));

    return balances;
  }
}

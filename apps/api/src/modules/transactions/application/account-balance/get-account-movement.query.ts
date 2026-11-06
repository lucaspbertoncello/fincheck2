import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The movement of an account day by day, for the balance curve: the transactions that enter the
// accounts, by their date. `accounts` asks it through its `AccountMovementReader`, which this class
// satisfies.
export class GetAccountMovementQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  // The sum of the transactions dated up to `upTo`, inclusive.
  async netUntil(
    accountId: string,
    upTo: BusinessDate,
    executor: Kysely<Database> = this.db,
  ): Promise<number> {
    const row = await executor
      .selectFrom('transactions as t')
      .select(sql<number>`coalesce(sum(t.amount_cents), 0)`.as('net_cents'))
      .where('t.account_id', '=', accountId)
      .where('t.occurred_on', '<=', upTo.value)
      .where(entersAccountsSql('t'))
      .executeTakeFirstOrThrow();

    return Number(row.net_cents);
  }

  // The sum by day (`YYYY-MM-DD`) in the range, inclusive; a day with no movement is absent.
  async netByDay(
    accountId: string,
    from: BusinessDate,
    to: BusinessDate,
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, number>> {
    const rows = await executor
      .selectFrom('transactions as t')
      .select(['t.occurred_on', sql<number>`sum(t.amount_cents)`.as('net_cents')])
      .where('t.account_id', '=', accountId)
      .where('t.occurred_on', '>=', from.value)
      .where('t.occurred_on', '<=', to.value)
      .where(entersAccountsSql('t'))
      .groupBy('t.occurred_on')
      .execute();

    return new Map(rows.map((row) => [row.occurred_on, Number(row.net_cents)]));
  }
}

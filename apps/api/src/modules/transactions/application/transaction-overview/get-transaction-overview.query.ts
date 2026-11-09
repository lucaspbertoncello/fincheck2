import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// How many transactions are kept and the date of the oldest: the numbers of the page Dados
// (BR-BKP-003). Every row counts, ignored ones included: it is what the database holds. `backup`
// asks it through its `TransactionOverviewReader`, which this class satisfies.
export class GetTransactionOverviewQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(): Promise<GetTransactionOverviewQuery.Output> {
    const row = await this.db
      .selectFrom('transactions')
      .select([
        sql<number>`count(*)`.as('total'),
        sql<string | null>`min(occurred_on)`.as('first_on'),
      ])
      .executeTakeFirstOrThrow();

    return { count: Number(row.total), firstOccurredOn: row.first_on };
  }
}

export namespace GetTransactionOverviewQuery {
  export type Output = { count: number; firstOccurredOn: string | null };
}

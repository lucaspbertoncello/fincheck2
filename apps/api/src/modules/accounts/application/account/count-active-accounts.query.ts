import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// How many accounts and cards are not archived: a number of the page Dados (BR-BKP-003). `backup`
// asks it through its `ActiveAccountCounter`, which this class satisfies.
export class CountActiveAccountsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(): Promise<number> {
    const row = await this.db
      .selectFrom('accounts')
      .select(sql<number>`count(*)`.as('total'))
      .where('archived_at', 'is', null)
      .executeTakeFirstOrThrow();

    return Number(row.total);
  }
}

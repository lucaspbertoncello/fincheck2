import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// How many rules have a condition on the account, to show before deleting it: without the account
// they would apply to everything, so they go with it (BR-ACC-008). `accounts` asks it through its
// `AccountRulesReader`, which this class satisfies.
export class CountAccountRulesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async countOf(accountId: string, executor: Kysely<Database> = this.db): Promise<number> {
    const row = await executor
      .selectFrom('category_rules')
      .select(sql<number>`count(*)`.as('total'))
      .where('account_id', '=', accountId)
      .executeTakeFirstOrThrow();

    return Number(row.total);
  }
}

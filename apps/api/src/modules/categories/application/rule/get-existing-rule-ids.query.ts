import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Which of the rule ids still exist. `transactions` asks it through its `CategoryRuleReader`, which
// this class satisfies: the "Desfazer" of a bulk action brings back the id of the rule that had
// categorized a transaction, and a rule deleted meanwhile must leave no id.
export class GetExistingRuleIdsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async existingRuleIds(
    ruleIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Set<string>> {
    if (ruleIds.length === 0) return new Set();
    const rows = await executor
      .selectFrom('category_rules')
      .select('id')
      .where('id', 'in', ruleIds)
      .execute();

    return new Set(rows.map((row) => row.id));
  }
}

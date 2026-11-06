import type { Kysely } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// How much the transactions use a category, a tag and a rule: the counts the screens of
// `categories` show ("38 transações", "Aplicada 38 vezes", "usada até maio"). `categories` asks it
// through its `TransactionUsageReader`, which this class satisfies.
export class GetTransactionUsageQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  // Transactions in each category: the ones with the category and the ones with a part in it, each
  // counted once, ignored and old ones included; and the latest date among them.
  async ofCategories(
    categoryIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, { transactionCount: number; lastUsedOn: string | null }>> {
    if (categoryIds.length === 0) return new Map();

    const whole = executor
      .selectFrom('transactions as t')
      .select(['t.category_id as category_id', 't.id as transaction_id', 't.occurred_on'])
      .where('t.category_id', 'in', categoryIds);
    const parts = executor
      .selectFrom('transaction_splits as s')
      .innerJoin('transactions as t', 't.id', 's.transaction_id')
      .select(['s.category_id as category_id', 't.id as transaction_id', 't.occurred_on'])
      .where('s.category_id', 'in', categoryIds);

    // `union` drops the repeat of a transaction that has the category and a part in it.
    const rows = await executor
      .selectFrom(whole.union(parts).as('usage'))
      .select([
        'usage.category_id',
        sql<number>`count(*)`.as('total'),
        sql<string>`max(usage.occurred_on)`.as('last_used_on'),
      ])
      .groupBy('usage.category_id')
      .execute();

    return new Map(
      rows.flatMap((row) =>
        row.category_id === null
          ? []
          : [
              [
                row.category_id,
                { transactionCount: Number(row.total), lastUsedOn: row.last_used_on },
              ] as const,
            ],
      ),
    );
  }

  // Transactions with each tag, ignored ones included.
  async ofTags(
    tagIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, number>> {
    if (tagIds.length === 0) return new Map();
    const rows = await executor
      .selectFrom('transaction_tags')
      .select(['tag_id', sql<number>`count(*)`.as('total')])
      .where('tag_id', 'in', tagIds)
      .groupBy('tag_id')
      .execute();

    return new Map(rows.map((row) => [row.tag_id, Number(row.total)]));
  }

  // Transactions categorized by each rule ("Aplicada 38 vezes").
  async ofRules(
    ruleIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, number>> {
    if (ruleIds.length === 0) return new Map();
    const rows = await executor
      .selectFrom('transactions')
      .select(['category_rule_id', sql<number>`count(*)`.as('total')])
      .where('category_rule_id', 'in', ruleIds)
      .groupBy('category_rule_id')
      .execute();

    return new Map(
      rows.flatMap((row) =>
        row.category_rule_id === null ? [] : [[row.category_rule_id, Number(row.total)] as const],
      ),
    );
  }
}

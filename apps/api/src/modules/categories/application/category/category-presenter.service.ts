import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely, Selectable } from 'kysely';
import { sql } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoriesTable } from '#/database/tables/categories/categories-table.type.ts';
import type { TransactionUsageReader } from '#/modules/categories/application/usage/transaction-usage-reader.interface.ts';

// Rows of `categories` into `Category.Dto`: adds the counts the screen shows. The transactions
// (`transactionCount`, `lastUsedOn`) come from the owner through its port; the rules are ours.
export class CategoryPresenter {
  private readonly db: Kysely<Database>;
  private readonly usage: TransactionUsageReader;

  constructor(db: Kysely<Database>, usage: TransactionUsageReader) {
    this.db = db;
    this.usage = usage;
  }

  async present(
    rows: Selectable<CategoriesTable>[],
    executor: Kysely<Database> = this.db,
  ): Promise<Category.Dto[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [usage, ruleRows] = await Promise.all([
      this.usage.ofCategories(ids, executor),
      executor
        .selectFrom('category_rules')
        .select(['category_id', sql<number>`count(*)`.as('total')])
        .where('category_id', 'in', ids)
        .groupBy('category_id')
        .execute(),
    ]);
    const ruleCounts = new Map(ruleRows.map((row) => [row.category_id, Number(row.total)]));

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      // Written only by the API, from the list of the contract.
      icon: row.icon as Category.Icon,
      isDefault: row.is_default === 1,
      archivedAt: row.archived_at,
      transactionCount: usage.get(row.id)?.transactionCount ?? 0,
      ruleCount: ruleCounts.get(row.id) ?? 0,
      lastUsedOn: usage.get(row.id)?.lastUsedOn ?? null,
    }));
  }

  async presentOne(
    row: Selectable<CategoriesTable>,
    executor: Kysely<Database> = this.db,
  ): Promise<Category.Dto> {
    const [dto] = await this.present([row], executor);
    if (dto === undefined) throw new RangeError('The presenter answered no category');

    return dto;
  }
}

import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryRulesTable } from '#/database/tables/categories/category-rules-table.type.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { CategoryRuleItem } from '#/modules/categories/infra/rule/category-rule.item.ts';

// The rules' store on SQLite. Every method accepts the executor of a unit of work; without it, it
// uses the default connection.
export class KyselyCategoryRuleRepository implements CategoryRuleRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<CategoryRule | null> {
    const row = await executor
      .selectFrom('category_rules')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row) return null;
    const [rule] = await this.hydrate([row], executor);

    return rule ?? null;
  }

  async list(executor: Kysely<Database> = this.db): Promise<CategoryRule[]> {
    const rows = await executor
      .selectFrom('category_rules')
      .selectAll()
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();

    return this.hydrate(rows, executor);
  }

  async save(rule: CategoryRule, executor: Kysely<Database> = this.db): Promise<void> {
    const { rule: row, tagIds } = CategoryRuleItem.fromEntity(rule);

    // `created_at` never changes, so it is not part of the update.
    await executor
      .insertInto('category_rules')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          description_contains: row.description_contains ?? null,
          counterparty_contains: row.counterparty_contains ?? null,
          kind: row.kind ?? null,
          account_id: row.account_id ?? null,
          amount_min_cents: row.amount_min_cents ?? null,
          amount_max_cents: row.amount_max_cents ?? null,
          category_id: row.category_id ?? null,
          enabled: row.enabled,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    await executor.deleteFrom('category_rule_tags').where('rule_id', '=', rule.id).execute();
    if (tagIds.length > 0) {
      await executor
        .insertInto('category_rule_tags')
        .values(tagIds.map((tagId) => ({ rule_id: rule.id, tag_id: tagId })))
        .execute();
    }
  }

  async delete(id: string, executor: Kysely<Database> = this.db): Promise<void> {
    // The tags go by `ON DELETE CASCADE`; `transactions.category_rule_id` becomes null by
    // `ON DELETE SET NULL`.
    await executor.deleteFrom('category_rules').where('id', '=', id).execute();
  }

  private async hydrate(
    rows: Selectable<CategoryRulesTable>[],
    executor: Kysely<Database>,
  ): Promise<CategoryRule[]> {
    if (rows.length === 0) return [];
    const tagRows = await executor
      .selectFrom('category_rule_tags')
      .selectAll()
      .where(
        'rule_id',
        'in',
        rows.map((row) => row.id),
      )
      .execute();
    const tagsByRule = new Map<string, string[]>();
    for (const tag of tagRows) {
      tagsByRule.set(tag.rule_id, [...(tagsByRule.get(tag.rule_id) ?? []), tag.tag_id]);
    }

    return rows.map((row) => CategoryRuleItem.toDomain(row, tagsByRule.get(row.id) ?? []));
  }
}

import type { Insertable, Selectable } from 'kysely';

import type { CategoryRulesTable } from '#/database/tables/categories/category-rules-table.type.ts';
import { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// The rule as rows: one of `category_rules` plus the ids of its tags (`category_rule_tags`).
export class CategoryRuleItem {
  static fromEntity(rule: CategoryRule): CategoryRuleItem.Rows {
    return {
      rule: {
        id: rule.id,
        description_contains: rule.descriptionContains,
        counterparty_contains: rule.counterpartyContains,
        kind: rule.kind,
        account_id: rule.accountId,
        amount_min_cents: rule.amountMinCents,
        amount_max_cents: rule.amountMaxCents,
        category_id: rule.categoryId,
        enabled: rule.enabled ? 1 : 0,
        created_at: rule.createdAt,
        updated_at: rule.updatedAt,
      },
      tagIds: [...rule.tagIds],
    };
  }

  static toDomain(row: Selectable<CategoryRulesTable>, tagIds: string[]): CategoryRule {
    return new CategoryRule({
      id: row.id,
      descriptionContains: row.description_contains,
      counterpartyContains: row.counterparty_contains,
      kind: row.kind,
      accountId: row.account_id,
      amountMinCents: row.amount_min_cents,
      amountMaxCents: row.amount_max_cents,
      categoryId: row.category_id,
      tagIds,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace CategoryRuleItem {
  export type Rows = { rule: Insertable<CategoryRulesTable>; tagIds: string[] };
}

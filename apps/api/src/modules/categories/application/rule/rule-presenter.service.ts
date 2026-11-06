import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionUsageReader } from '#/modules/categories/application/usage/transaction-usage-reader.interface.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// Rules into `Rule.Dto`: adds "Aplicada 38 vezes", which the owner of the transactions answers.
export class RulePresenter {
  private readonly db: Kysely<Database>;
  private readonly usage: TransactionUsageReader;

  constructor(db: Kysely<Database>, usage: TransactionUsageReader) {
    this.db = db;
    this.usage = usage;
  }

  async present(rules: CategoryRule[], executor: Kysely<Database> = this.db): Promise<Rule.Dto[]> {
    if (rules.length === 0) return [];
    const applied = await this.usage.ofRules(
      rules.map((rule) => rule.id),
      executor,
    );

    return rules.map((rule) => ({
      id: rule.id,
      descriptionContains: rule.descriptionContains,
      counterpartyContains: rule.counterpartyContains,
      kind: rule.kind,
      accountId: rule.accountId,
      amountMinCents: rule.amountMinCents,
      amountMaxCents: rule.amountMaxCents,
      categoryId: rule.categoryId,
      tagIds: [...rule.tagIds],
      enabled: rule.enabled,
      appliedCount: applied.get(rule.id) ?? 0,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }));
  }

  async presentOne(rule: CategoryRule, executor: Kysely<Database> = this.db): Promise<Rule.Dto> {
    const [dto] = await this.present([rule], executor);
    if (dto === undefined) throw new RangeError('The presenter answered no rule');

    return dto;
  }
}

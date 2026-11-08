import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';

// Deletes the rules with a condition on the account, inside the unit of work of the deletion of the
// account (BR-ACC-008): without the account they would apply to everything. The transactions they
// categorized keep the category and lose the link to the rule. Satisfies the `DeleteAccountRules`
// port of `accounts`.
export class DeleteAccountRulesUseCase {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;

  constructor(rules: CategoryRuleRepository<Kysely<Database>>) {
    this.rules = rules;
  }

  async execute(accountId: string, executor: Kysely<Database>): Promise<void> {
    await this.rules.deleteByAccount(accountId, executor);
  }
}

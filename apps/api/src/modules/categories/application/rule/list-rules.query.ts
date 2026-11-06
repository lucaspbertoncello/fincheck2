import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RulePresenter } from '#/modules/categories/application/rule/rule-presenter.service.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';

// Every rule, on or off, the oldest first: the oldest wins on the category (`GET /rules`).
export class ListRulesQuery {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly presenter: RulePresenter;

  constructor(rules: CategoryRuleRepository<Kysely<Database>>, presenter: RulePresenter) {
    this.rules = rules;
    this.presenter = presenter;
  }

  async execute(): Promise<ListRulesQuery.Output> {
    return { items: await this.presenter.present(await this.rules.list()) };
  }
}

export namespace ListRulesQuery {
  export type Output = { items: Rule.Dto[] };
}

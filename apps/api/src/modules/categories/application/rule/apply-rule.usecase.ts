import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildHistoryDefinition } from '#/modules/categories/application/rule/build-history-definition.util.ts';
import { findOlderRuleIds } from '#/modules/categories/application/rule/find-older-rule-ids.util.ts';
import type { ApplyRuleToHistory } from '#/modules/categories/application/rule/apply-rule-to-history.interface.ts';
import type { RuleReferenceResolver } from '#/modules/categories/application/rule/rule-reference-resolver.service.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { RuleNotFoundError } from '#/modules/categories/domain/rule/rule-not-found.error.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Aplicar nas transações existentes" (RF-CAT-006): the rule that is on over the history, at any
// time. Not a transaction Lucas, a recurrence, a bill or an older rule categorized. Nothing to change:
// `changedCount` 0 and no `previous`.
export class ApplyRuleUseCase {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly references: RuleReferenceResolver;
  private readonly history: ApplyRuleToHistory;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(
    rules: CategoryRuleRepository<Kysely<Database>>,
    references: RuleReferenceResolver,
    history: ApplyRuleToHistory,
    unitOfWork: UnitOfWork<Kysely<Database>>,
  ) {
    this.rules = rules;
    this.references = references;
    this.history = history;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: ApplyRuleUseCase.Input): Promise<ApplyRuleUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const all = await this.rules.list(executor);
      const rule = all.find((item) => item.id === input.ruleId);
      if (!rule) throw new RuleNotFoundError();

      const category = await this.references.category(rule.categoryId, executor);
      rule.assertAppliable(category);
      // A tag archived after the rule was made is not added to the history any more.
      const tagIds = (await this.references.tagsOf(rule.tagIds, executor))
        .filter((tag) => !tag.isArchived)
        .map((tag) => tag.id);
      if (category === null && tagIds.length === 0) return { changedCount: 0, previous: [] };

      return this.history.execute(
        {
          ruleId: rule.id,
          definition: buildHistoryDefinition({
            condition: rule.condition(),
            category,
            tagIds,
            olderRuleIds: findOlderRuleIds(all, rule.id),
          }),
        },
        executor,
      );
    });
  }
}

export namespace ApplyRuleUseCase {
  export type Input = { ruleId: string };
  export type Output = Rule.ApplyResult;
}

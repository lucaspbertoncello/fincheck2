import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildHistoryDefinition } from '#/modules/categories/application/rule/build-history-definition.util.ts';
import { findOlderRuleIds } from '#/modules/categories/application/rule/find-older-rule-ids.util.ts';
import type { ApplyRuleToHistory } from '#/modules/categories/application/rule/apply-rule-to-history.interface.ts';
import type { RulePresenter } from '#/modules/categories/application/rule/rule-presenter.service.ts';
import type { RuleReferenceResolver } from '#/modules/categories/application/rule/rule-reference-resolver.service.ts';
import { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { RuleDuplicateError } from '#/modules/categories/domain/rule/rule-duplicate.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// Creates a rule, inside the unit of work of the caller, and applies it to the history when asked.
// `POST /rules` and the acceptance of a suggestion do exactly this, so it is written once. All or
// nothing: if the rule is refused, the history is not touched; if applying fails, the rule is not
// saved.
export class RuleCreator {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly references: RuleReferenceResolver;
  private readonly history: ApplyRuleToHistory;
  private readonly presenter: RulePresenter;
  private readonly clock: Clock;

  constructor(
    rules: CategoryRuleRepository<Kysely<Database>>,
    references: RuleReferenceResolver,
    history: ApplyRuleToHistory,
    presenter: RulePresenter,
    clock: Clock,
  ) {
    this.rules = rules;
    this.references = references;
    this.history = history;
    this.presenter = presenter;
    this.clock = clock;
  }

  async execute(input: RuleCreator.Input, executor: Kysely<Database>): Promise<RuleCreator.Output> {
    await this.references.account(input.accountId, executor);
    const category = await this.references.category(input.categoryId, executor);
    const tagIds = [...new Set(input.tagIds)];
    const tags = await this.references.tagsOf(tagIds, executor);

    const rule = CategoryRule.create(
      {
        descriptionContains: input.descriptionContains,
        counterpartyContains: input.counterpartyContains,
        kind: input.kind,
        accountId: input.accountId,
        amountMinCents: input.amountMinCents,
        amountMaxCents: input.amountMaxCents,
        category,
        tags,
      },
      this.clock.now(),
    );

    const existing = await this.rules.list(executor);
    if (existing.some((other) => other.hasSameConditionAs(rule.condition()))) {
      throw new RuleDuplicateError();
    }
    await this.rules.save(rule, executor);

    const applied = input.applyToHistory
      ? await this.history.execute(
          {
            ruleId: rule.id,
            // The new rule is the youngest: every rule that exists is older.
            definition: buildHistoryDefinition({
              condition: rule.condition(),
              category,
              tagIds: rule.tagIds,
              olderRuleIds: findOlderRuleIds(existing, null),
            }),
          },
          executor,
        )
      : null;

    return { rule: await this.presenter.presentOne(rule, executor), applied };
  }
}

export namespace RuleCreator {
  export type Input = CategoryRule.Condition & {
    categoryId: string | null;
    tagIds: string[];
    applyToHistory: boolean;
  };
  export type Output = Rule.CreateResult;
}

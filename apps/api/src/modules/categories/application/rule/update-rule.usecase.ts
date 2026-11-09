import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RulePresenter } from '#/modules/categories/application/rule/rule-presenter.service.ts';
import type { RuleReferenceResolver } from '#/modules/categories/application/rule/rule-reference-resolver.service.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { RuleDuplicateError } from '#/modules/categories/domain/rule/rule-duplicate.error.ts';
import { RuleNotFoundError } from '#/modules/categories/domain/rule/rule-not-found.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Editar" and the on/off switch (RF-CAT-004). It changes the rule, not the transactions: to
// reapply, the front calls `POST /rules/:id/apply`.
export class UpdateRuleUseCase {
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly references: RuleReferenceResolver;
  private readonly presenter: RulePresenter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    rules: CategoryRuleRepository<Kysely<Database>>,
    references: RuleReferenceResolver,
    presenter: RulePresenter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.rules = rules;
    this.references = references;
    this.presenter = presenter;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateRuleUseCase.Input): Promise<UpdateRuleUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const rule = await this.rules.findById(input.ruleId, executor);
      if (!rule) throw new RuleNotFoundError();
      const { body } = input;

      if (body.accountId) await this.references.account(body.accountId, executor);
      const nextCategoryId = body.categoryId === undefined ? rule.categoryId : body.categoryId;
      const category = await this.references.category(nextCategoryId, executor);
      // The whole set the rule ends up with: its tags must fit the category it ends up with.
      const nextTagIds = [...new Set(body.tagIds ?? rule.tagIds)];
      const tags = await this.references.tagsOf(nextTagIds, executor);

      rule.edit(body, { category, tags }, this.clock.now());

      const others = (await this.rules.list(executor)).filter((other) => other.id !== rule.id);
      if (others.some((other) => other.hasSameConditionAs(rule.condition()))) {
        throw new RuleDuplicateError();
      }
      await this.rules.save(rule, executor);

      return this.presenter.presentOne(rule, executor);
    });
  }
}

export namespace UpdateRuleUseCase {
  export type Input = { ruleId: string; body: Rule.UpdateRequest };
  export type Output = Rule.Dto;
}

import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RuleCreator } from '#/modules/categories/application/rule/rule-creator.service.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova regra" (RF-CAT-004), with or without applying it to the history right away (RF-CAT-006).
export class CreateRuleUseCase {
  private readonly creator: RuleCreator;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(creator: RuleCreator, unitOfWork: UnitOfWork<Kysely<Database>>) {
    this.creator = creator;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: CreateRuleUseCase.Input): Promise<CreateRuleUseCase.Output> {
    return this.unitOfWork.run((executor) =>
      this.creator.execute(
        {
          descriptionContains: input.descriptionContains ?? null,
          counterpartyContains: input.counterpartyContains ?? null,
          kind: input.kind ?? null,
          accountId: input.accountId ?? null,
          amountMinCents: input.amountMinCents ?? null,
          amountMaxCents: input.amountMaxCents ?? null,
          categoryId: input.categoryId ?? null,
          tagIds: input.tagIds ?? [],
          applyToHistory: input.applyToHistory ?? false,
        },
        executor,
      ),
    );
  }
}

export namespace CreateRuleUseCase {
  export type Input = Rule.CreateRequest;
  export type Output = Rule.CreateResult;
}

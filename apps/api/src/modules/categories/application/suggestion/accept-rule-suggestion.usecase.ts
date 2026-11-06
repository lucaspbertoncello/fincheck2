import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { RuleSuggestion } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RuleCreator } from '#/modules/categories/application/rule/rule-creator.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { normalizeDescription } from '#/shared/text/normalize-description.util.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Criar regra" on the card and on the question after recategorizing (RF-CAT-005): creates the rule
// "description contains the pattern" for the category, as `POST /rules` does, and records the
// answer so the suggestion does not come back. One unit of work: if the rule is refused, the
// answer is not recorded either.
export class AcceptRuleSuggestionUseCase {
  private readonly creator: RuleCreator;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(creator: RuleCreator, unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.creator = creator;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: AcceptRuleSuggestionUseCase.Input,
  ): Promise<AcceptRuleSuggestionUseCase.Output> {
    const pattern = normalizeDescription(input.pattern);
    if (pattern.length < 2 || pattern.length > 100) {
      throw new RequestValidationError([
        { path: 'pattern', message: 'The pattern must have between 2 and 100 characters' },
      ]);
    }

    return this.unitOfWork.run(async (executor) => {
      const result = await this.creator.execute(
        {
          descriptionContains: pattern,
          counterpartyContains: null,
          kind: null,
          accountId: null,
          amountMinCents: null,
          amountMaxCents: null,
          categoryId: input.categoryId,
          tagIds: input.tagIds ?? [],
          applyToHistory: input.applyToHistory,
        },
        executor,
      );

      await executor
        .insertInto('rule_suggestions')
        .values({
          id: generateId(),
          pattern,
          category_id: input.categoryId,
          status: 'accepted',
          decided_at: this.clock.now(),
        })
        .onConflict((conflict) =>
          conflict.columns(['pattern', 'category_id']).doUpdateSet({
            status: 'accepted',
            decided_at: this.clock.now(),
          }),
        )
        .execute();

      return result;
    });
  }
}

export namespace AcceptRuleSuggestionUseCase {
  export type Input = RuleSuggestion.AcceptRequest;
  export type Output = Rule.CreateResult;
}

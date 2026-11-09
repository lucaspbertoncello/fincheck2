import type { RuleSuggestion } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireCategoryRow } from '#/modules/categories/application/category/require-category-row.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Agora não" (RF-CAT-005): the same suggestion does not come back; the same pattern for another
// category does. Answering twice records once.
export class DismissRuleSuggestionUseCase {
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(unitOfWork: UnitOfWork<Kysely<Database>>, clock: Clock) {
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DismissRuleSuggestionUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      await requireCategoryRow(executor, input.categoryId);

      await executor
        .insertInto('rule_suggestions')
        .values({
          id: generateId(),
          pattern: normalizeDescription(input.pattern),
          category_id: input.categoryId,
          status: 'dismissed',
          decided_at: this.clock.now(),
        })
        .onConflict((conflict) => conflict.columns(['pattern', 'category_id']).doNothing())
        .execute();
    });
  }
}

export namespace DismissRuleSuggestionUseCase {
  export type Input = RuleSuggestion.DismissRequest;
}

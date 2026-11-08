import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SubscriptionSuggestionFinder } from '#/modules/recurrences/application/subscription/subscription-suggestion-finder.service.ts';
import { parseSubscriptionKey } from '#/modules/recurrences/domain/subscription/parse-subscription-key.util.ts';
import { SubscriptionSuggestionNotFoundError } from '#/modules/recurrences/domain/subscription/subscription-suggestion-not-found.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Agora não" (BR-REC-017): the suggestion of that description on that card does not come back.
// The decision is recorded under the pair (normalized description, card). A key that no longer
// yields a suggestion is a 404, unless it was already dismissed: answering twice records once.
export class DismissSubscriptionSuggestionUseCase {
  private readonly suggestions: SubscriptionSuggestionFinder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    suggestions: SubscriptionSuggestionFinder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.suggestions = suggestions;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DismissSubscriptionSuggestionUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const key = parseSubscriptionKey(input.key);
      if (!key) throw new SubscriptionSuggestionNotFoundError();

      const already = await executor
        .selectFrom('subscription_suggestion_dismissals')
        .select('pattern')
        .where('pattern', '=', key.pattern)
        .where('account_id', '=', key.accountId)
        .executeTakeFirst();
      if (already) return;

      const exists = (await this.suggestions.find(executor)).some(
        (candidate) => candidate.suggestion.key === input.key,
      );
      if (!exists) throw new SubscriptionSuggestionNotFoundError();

      await executor
        .insertInto('subscription_suggestion_dismissals')
        .values({ pattern: key.pattern, account_id: key.accountId, dismissed_at: this.clock.now() })
        .onConflict((conflict) => conflict.columns(['pattern', 'account_id']).doNothing())
        .execute();
    });
  }
}

export namespace DismissSubscriptionSuggestionUseCase {
  export type Input = Subscription.DismissRequest;
}

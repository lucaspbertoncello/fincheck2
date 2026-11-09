import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import type { RecurrenceActivator } from '#/modules/recurrences/application/recurrence/recurrence-activator.service.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { RecurrenceCategoryReader } from '#/modules/recurrences/application/recurrence/recurrence-category-reader.interface.ts';
import type { SubscriptionSuggestionFinder } from '#/modules/recurrences/application/subscription/subscription-suggestion-finder.service.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { buildSubscriptionName } from '#/modules/recurrences/domain/subscription/build-subscription-name.util.ts';
import { parseSubscriptionKey } from '#/modules/recurrences/domain/subscription/parse-subscription-key.util.ts';
import { recognizeServiceSlug } from '@fincheck/shared/recurrences/subscription-service/recognize-service-slug.util.ts';
import { SubscriptionSuggestionNotFoundError } from '#/modules/recurrences/domain/subscription/subscription-suggestion-not-found.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Acompanhar" a suggestion (BR-REC-017): creates the expense recurrence it proposes, marked as a
// subscription, on the card, fixed on the day of the last charge, worth the last amount, matching
// its description, and ties the charges it saw to the occurrences of their own months (past months
// are opened for it and expect what was charged). The body may overwrite the name, the category,
// the sender text, the counterparty and the service. Without a service it takes the one the
// description names, if any; `null` is "Outro". The suggestion is gone afterwards: the recurrence
// covers it. A charge still held by a deleted recurrence (accepting again after "Desfazer") is
// taken over.
export class AcceptSubscriptionSuggestionUseCase {
  private readonly suggestions: SubscriptionSuggestionFinder;
  private readonly categories: RecurrenceCategoryReader;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly activator: RecurrenceActivator;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    suggestions: SubscriptionSuggestionFinder,
    categories: RecurrenceCategoryReader,
    transactions: OccurrenceTransactionReader,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    activator: RecurrenceActivator,
    builder: OccurrenceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.suggestions = suggestions;
    this.categories = categories;
    this.transactions = transactions;
    this.occurrences = occurrences;
    this.activator = activator;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: AcceptSubscriptionSuggestionUseCase.Input,
  ): Promise<AcceptSubscriptionSuggestionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const candidate = (await this.suggestions.find(executor)).find(
        (item) => item.suggestion.key === input.key,
      );
      const key = parseSubscriptionKey(input.key);
      const first = candidate?.charges[0];
      const last = candidate?.charges.at(-1);
      if (!candidate || !key || !first || !last) throw new SubscriptionSuggestionNotFoundError();

      const category =
        input.categoryId === undefined
          ? null
          : ((await this.categories.requireCategories([input.categoryId], executor)).get(
              input.categoryId,
            ) ?? null);

      const recurrence = Recurrence.create(
        {
          kind: 'expense',
          name: input.name ?? buildSubscriptionName(key.pattern),
          expectedAmount: Money.fromCents(last.amountCents),
          counterparty: input.counterparty,
          matchText: input.matchText ?? key.pattern,
          accountId: candidate.suggestion.accountId,
          method: 'credit',
          categoryId: input.categoryId,
          isSubscription: true,
          serviceSlug:
            input.serviceSlug === undefined
              ? recognizeServiceSlug(candidate.suggestion.description)
              : input.serviceSlug,
          dateRule: DateRule.create({ type: 'fixed_day', day: last.occurredOn.day }),
          maxPayments: 1,
          startsMonth: Month.containing(first.occurredOn),
        },
        this.clock.now(),
      );
      if (category) recurrence.assertCategoryFits(category);

      const chargeIds = candidate.charges.map((charge) => charge.transactionId);
      await this.releaseFromDeletedRecurrences(chargeIds, executor);
      const snapshots = [...(await this.transactions.findMany(chargeIds, executor)).values()];

      const { currentMonth } = await this.activator.activate(
        { recurrence, transactions: snapshots, pastMonthsTakeTheChargedAmount: true },
        executor,
      );

      return {
        recurrence: toRecurrenceDto(recurrence),
        occurrence: currentMonth ? await this.builder.buildOne(currentMonth, executor) : null,
      };
    });
  }

  // A link to a deleted recurrence is history, no more: the charge goes to the new one.
  private async releaseFromDeletedRecurrences(
    transactionIds: string[],
    executor: Kysely<Database>,
  ): Promise<void> {
    const held = await this.occurrences.findByLinkedTransactionIds(transactionIds, executor);
    const now = this.clock.now();
    for (const occurrence of held) {
      for (const payment of occurrence.payments.filter((candidate) =>
        transactionIds.includes(candidate.transactionId),
      )) {
        occurrence.unlink(payment.id, now);
      }
      await this.occurrences.save(occurrence, executor);
    }
  }
}

export namespace AcceptSubscriptionSuggestionUseCase {
  export type Input = Subscription.AcceptRequest;
  export type Output = Subscription.AcceptResponse;
}

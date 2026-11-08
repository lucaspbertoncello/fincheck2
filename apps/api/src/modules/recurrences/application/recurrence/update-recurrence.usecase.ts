import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { OccurrenceOpener } from '#/modules/recurrences/application/occurrence/occurrence-opener.service.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { RecurrenceAccountReader } from '#/modules/recurrences/application/recurrence/recurrence-account-reader.interface.ts';
import type { RecurrenceCategoryReader } from '#/modules/recurrences/application/recurrence/recurrence-category-reader.interface.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { RecurrenceAccountArchivedError } from '#/modules/recurrences/domain/recurrence/recurrence-account-archived.error.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Editar recorrência" with "A mudança vale" (RF-REC-001, 008). The recurrence changes at once.
// The occurrences copy only the field that moved in this edit, so a value edited by hand in another
// month stays: the months after the current one that nobody touched are redone (amount, day,
// window); the current month only when Lucas chose "também neste mês" and nobody touched it; past
// months never. A month with a payment or a mark stays as it is. Moving the first month later drops
// the untouched occurrences before it, from the current month on. The order of the errors: the
// recurrence that does not exist, or is deleted, the account and the category that do not exist
// (404), the regime and the category of the wrong kind (422).
export class UpdateRecurrenceUseCase {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly accounts: RecurrenceAccountReader;
  private readonly categories: RecurrenceCategoryReader;
  private readonly opener: OccurrenceOpener;
  private readonly ensure: EnsureOccurrencesUseCase;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    accounts: RecurrenceAccountReader,
    categories: RecurrenceCategoryReader,
    opener: OccurrenceOpener,
    ensure: EnsureOccurrencesUseCase,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.accounts = accounts;
    this.categories = categories;
    this.opener = opener;
    this.ensure = ensure;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateRecurrenceUseCase.Input): Promise<UpdateRecurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const recurrence = await requireRecurrence(this.recurrences, input.id, executor);
      recurrence.assertNotArchived();

      const startsMonth = input.startsMonth === undefined ? undefined : Month.of(input.startsMonth);
      if (startsMonth) assertSupportedMonth(startsMonth, 'startsMonth');
      const account =
        typeof input.accountId === 'string'
          ? await this.accounts.requireAccount(input.accountId, executor)
          : null;
      const category =
        typeof input.categoryId === 'string'
          ? ((await this.categories.requireCategories([input.categoryId], executor)).get(
              input.categoryId,
            ) ?? null)
          : null;

      // Moving it to an archived account is refused; one that already lives there stays as it is.
      if (account?.isArchived && input.accountId !== recurrence.accountId) {
        throw new RecurrenceAccountArchivedError();
      }

      const changes = recurrence.edit(
        {
          name: input.name,
          expectedAmount:
            input.expectedAmountCents === undefined
              ? undefined
              : Money.fromCents(input.expectedAmountCents),
          amountMode: input.amountMode,
          counterparty: input.counterparty,
          matchText: input.matchText,
          employmentRegime: input.employmentRegime,
          accountId: input.accountId,
          method: input.method,
          categoryId: input.categoryId,
          isSubscription: input.isSubscription,
          serviceSlug: input.serviceSlug,
          dateRule: input.dateRule === undefined ? undefined : DateRule.create(input.dateRule),
          maxPayments: input.maxPayments,
          startsMonth,
        },
        now,
      );
      if (category) recurrence.assertCategoryFits(category);
      await this.recurrences.save(recurrence, executor);

      const currentMonth = Month.containing(this.clock.today());
      const alsoThisMonth = input.applyFrom === 'current_month';
      const toDrop: string[] = [];
      const siblings = await this.occurrences.findByRecurrenceIds(
        [recurrence.id],
        undefined,
        executor,
      );
      for (const occurrence of siblings) {
        if (occurrence.month.value < currentMonth.value || !occurrence.isUntouched()) continue;

        if (changes.startsLater && occurrence.month.value < recurrence.startsMonth.value) {
          toDrop.push(occurrence.id);
          continue;
        }
        const editable =
          occurrence.month.value > currentMonth.value ||
          (occurrence.month.value === currentMonth.value && alsoThisMonth);
        if (!editable || (!changes.amount && !changes.dateRule)) continue;

        if (changes.amount) occurrence.retarget(recurrence.expectedAmount, now);
        if (changes.dateRule) {
          occurrence.reschedule(this.opener.windowOf(recurrence, occurrence.month), now);
        }
        await this.occurrences.save(occurrence, executor);
      }
      await this.occurrences.deleteByIds(toDrop, executor);
      await this.ensure.execute(executor);

      return toRecurrenceDto(recurrence);
    });
  }
}

export namespace UpdateRecurrenceUseCase {
  export type Input = RecurrenceContract.UpdateRequest & { id: string };
  export type Output = RecurrenceContract.Dto;
}

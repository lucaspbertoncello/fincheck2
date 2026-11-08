import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { ApplyRecurrenceCategory } from '#/modules/recurrences/application/occurrence-payment/apply-recurrence-category.interface.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import type { RecurrenceAmountUpdater } from '#/modules/recurrences/application/recurrence/recurrence-amount-updater.service.ts';
import type { RecurrenceCategoryReader } from '#/modules/recurrences/application/recurrence/recurrence-category-reader.interface.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// Ties a transaction to an occurrence, in the unit of work of the caller. The payment is written,
// the category of the recurrence goes to the transaction when it has none (`transactions` decides,
// through its use case), and a source that follows the last amount received takes the amount of
// the occurrence the moment it is confirmed with a different one (BR-REC-014), which also answers
// the difference. The caller has already checked that the transaction can pay and is free.
export class OccurrencePaymentLinker {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly categories: RecurrenceCategoryReader;
  private readonly applyCategory: ApplyRecurrenceCategory;
  private readonly amountUpdater: RecurrenceAmountUpdater;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    categories: RecurrenceCategoryReader,
    applyCategory: ApplyRecurrenceCategory,
    amountUpdater: RecurrenceAmountUpdater,
    builder: OccurrenceDtoBuilder,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.categories = categories;
    this.applyCategory = applyCategory;
    this.amountUpdater = amountUpdater;
    this.builder = builder;
    this.clock = clock;
  }

  async link(
    input: {
      occurrence: Occurrence;
      recurrence: Recurrence;
      transaction: OccurrenceTransactionReader.Snapshot;
      linkedBy: 'auto' | 'user';
    },
    executor: Kysely<Database>,
  ): Promise<void> {
    const { occurrence, recurrence, transaction } = input;
    const now = this.clock.now();

    occurrence.link(
      {
        transactionId: transaction.id,
        amount: Money.fromCents(Math.abs(transaction.amountCents)),
        linkedBy: input.linkedBy,
      },
      now,
    );
    await this.occurrences.save(occurrence, executor);

    if (recurrence.categoryId !== null) {
      const category = (
        await this.categories.requireCategories([recurrence.categoryId], executor)
      ).get(recurrence.categoryId);
      if (category) await this.applyCategory.execute(transaction.id, category, executor);
    }

    if (recurrence.amountMode === 'last_received') {
      const [view] = await this.builder.views([occurrence], executor);
      if (view?.state.status === 'confirmed' && view.state.difference !== null) {
        occurrence.decideDifference('updated', true, now);
        await this.occurrences.save(occurrence, executor);
        await this.amountUpdater.adoptReceivedAmount(
          { recurrence, from: occurrence, receivedCents: view.state.receivedCents },
          now,
          executor,
        );
      }
    }
  }
}

import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import type { OccurrenceOpener } from '#/modules/recurrences/application/occurrence/occurrence-opener.service.ts';
import type { OccurrencePaymentLinker } from '#/modules/recurrences/application/occurrence-payment/occurrence-payment-linker.service.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// Brings a new recurrence to life, in the unit of work of the caller: writes it, creates its
// occurrences (the current month and the 3 after it, from its first month) and ties the
// transactions it was born from to the occurrence of their own month, creating that one when it is
// a month the routine does not cover (a past month, R7). The links are Lucas's choice
// (`linkedBy = user`), which the automatic match never undoes. Used by "Nova recorrência" and by
// accepting a subscription suggestion.
export class RecurrenceActivator {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly ensure: EnsureOccurrencesUseCase;
  private readonly opener: OccurrenceOpener;
  private readonly linker: OccurrencePaymentLinker;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    ensure: EnsureOccurrencesUseCase,
    opener: OccurrenceOpener,
    linker: OccurrencePaymentLinker,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.ensure = ensure;
    this.opener = opener;
    this.linker = linker;
    this.clock = clock;
  }

  // `currentMonth` is the occurrence of the current month, or null when the recurrence has none
  // yet (it starts later). `linked` are the occurrences that received a transaction, in the order
  // of the transactions given. With `pastMonthsTakeTheChargedAmount`, an occurrence created for a
  // past month expects what was charged in it, so a price that changed over time does not leave a
  // difference to answer in every old month.
  async activate(
    input: {
      recurrence: Recurrence;
      transactions: OccurrenceTransactionReader.Snapshot[];
      pastMonthsTakeTheChargedAmount?: boolean;
    },
    executor: Kysely<Database>,
  ): Promise<{ currentMonth: Occurrence | null; linked: Occurrence[] }> {
    const { recurrence } = input;
    const now = this.clock.now();
    const currentMonth = Month.containing(this.clock.today());

    await this.recurrences.save(recurrence, executor);
    await this.ensure.execute(executor);

    const byMonth = new Map<string, Occurrence>();
    const linked: Occurrence[] = [];
    const ordered = input.transactions.toSorted((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    for (const transaction of ordered) {
      const month = Month.containing(BusinessDate.of(transaction.occurredOn));
      assertSupportedMonth(month, 'linkTransactionId');

      let target = byMonth.get(month.value);
      if (!target) {
        const [existing] = await this.occurrences.findByRecurrenceIds(
          [recurrence.id],
          [month],
          executor,
        );
        const past = month.value < currentMonth.value;
        target =
          existing ??
          this.opener.open(
            recurrence,
            month,
            now,
            past && input.pastMonthsTakeTheChargedAmount
              ? Money.fromCents(Math.abs(transaction.amountCents))
              : recurrence.expectedAmount,
          );
        byMonth.set(month.value, target);
      }

      await this.linker.link(
        { occurrence: target, recurrence, transaction, linkedBy: 'user' },
        executor,
      );
      if (!linked.includes(target)) linked.push(target);
    }

    const current =
      byMonth.get(currentMonth.value) ??
      (await this.occurrences.findByRecurrenceIds([recurrence.id], [currentMonth], executor))[0] ??
      null;

    return { currentMonth: current, linked };
  }
}

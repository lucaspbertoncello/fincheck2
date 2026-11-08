import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { MonthOccurrenceLoader } from '#/modules/recurrences/application/occurrence/month-occurrence-loader.service.ts';
import { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Outubro, dia a dia" and "Precisa de você" (RF-REC-002, 006, 009): the occurrences of a month by
// expected day (no day last), then by the name of the recurrence. In the current month it also
// brings the ones from the last 3 months that still ask for an action (late, or a different value
// nobody answered, decision R6), marked `carriedOver`, until they are answered. A deleted
// recurrence only shows what is history. The controller creates the missing occurrences first.
export class ListOccurrencesQuery {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly loader: MonthOccurrenceLoader;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    loader: MonthOccurrenceLoader,
    builder: OccurrenceDtoBuilder,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.loader = loader;
    this.builder = builder;
    this.clock = clock;
  }

  // The earlier months that come along into the current one: the last 3. An older late occurrence
  // stays where it was (`skip` still dismisses it; nothing asks for it any more). A paused recurrence
  // brings nothing.
  private static oldestCarriedMonth(month: Month): Month {
    return month.previous().previous().previous();
  }

  async execute(input: ListOccurrencesQuery.Input): Promise<ListOccurrencesQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');
    const isCurrentMonth = month.equals(Month.containing(this.clock.today()));

    const [ofMonth, pendingBefore] = await Promise.all([
      this.loader.load(month),
      isCurrentMonth
        ? this.occurrences
            .findPendingBefore({
              since: ListOccurrencesQuery.oldestCarriedMonth(month),
              before: month,
            })
            .then((found) => this.builder.views(found))
        : Promise.resolve([]),
    ]);

    const items = [
      ...ofMonth.map((view) => OccurrenceDtoBuilder.toDto(view)),
      ...pendingBefore
        .filter((view) => view.state.needsAttention)
        .map((view) => OccurrenceDtoBuilder.toDto(view, { carriedOver: true })),
    ].filter(
      (occurrence) =>
        input.needsAttention === undefined || occurrence.needsAttention === input.needsAttention,
    );

    return {
      items: items.toSorted((a, b) => {
        if (a.expectedOn !== b.expectedOn) {
          if (a.expectedOn === null) return 1;
          if (b.expectedOn === null) return -1;

          return a.expectedOn.localeCompare(b.expectedOn);
        }

        return a.recurrenceName.localeCompare(b.recurrenceName, 'pt-BR', { sensitivity: 'base' });
      }),
    };
  }
}

export namespace ListOccurrencesQuery {
  export type Input = OccurrenceContract.ListQuery;
  export type Output = { items: OccurrenceContract.Dto[] };
}

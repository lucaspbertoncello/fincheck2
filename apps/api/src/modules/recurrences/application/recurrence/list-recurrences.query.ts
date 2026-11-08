import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { MonthOccurrenceLoader } from '#/modules/recurrences/application/occurrence/month-occurrence-loader.service.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// "Recorrências": every recurrence with the occurrence of the month asked (RF-REC-001, 005, 009).
// Income first, then by the expected day (no occurrence or no day last), then by name without
// accent or case. The occurrence is null when the recurrence has none that month (paused, not
// started, a month the routine does not cover) or when it is deleted and the occurrence is only an
// untouched leftover. The controller creates the missing occurrences before it asks.
export class ListRecurrencesQuery {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly loader: MonthOccurrenceLoader;

  constructor(recurrences: RecurrenceRepository<Kysely<Database>>, loader: MonthOccurrenceLoader) {
    this.recurrences = recurrences;
    this.loader = loader;
  }

  async execute(input: ListRecurrencesQuery.Input): Promise<ListRecurrencesQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');

    const [recurrences, views] = await Promise.all([
      this.recurrences.findMany({ includeArchived: input.includeArchived }),
      this.loader.load(month),
    ]);
    const viewByRecurrence = new Map(views.map((view) => [view.recurrence.id, view]));

    const items = recurrences.map((recurrence) => {
      const view = viewByRecurrence.get(recurrence.id);

      return {
        ...toRecurrenceDto(recurrence),
        occurrence: view ? OccurrenceDtoBuilder.toDto(view) : null,
      };
    });

    return {
      items: items.toSorted((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'income' ? -1 : 1;
        const dayA = a.occurrence?.expectedOn ?? null;
        const dayB = b.occurrence?.expectedOn ?? null;
        if (dayA !== dayB) {
          if (dayA === null) return 1;
          if (dayB === null) return -1;

          return dayA.localeCompare(dayB);
        }

        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      }),
    };
  }
}

export namespace ListRecurrencesQuery {
  export type Input = RecurrenceContract.ListQuery;
  export type Output = { items: RecurrenceContract.ListItem[] };
}

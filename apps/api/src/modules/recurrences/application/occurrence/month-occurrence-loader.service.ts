import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The occurrences of a month, with their state. One of a deleted recurrence only counts when it is
// history (it has a payment or a mark): an old one nobody touched is no longer shown.
export class MonthOccurrenceLoader {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;

  constructor(occurrences: OccurrenceRepository<Kysely<Database>>, builder: OccurrenceDtoBuilder) {
    this.occurrences = occurrences;
    this.builder = builder;
  }

  async load(month: Month, executor?: Kysely<Database>): Promise<OccurrenceDtoBuilder.View[]> {
    const views = await this.builder.views(
      await this.occurrences.findByMonths([month], executor),
      executor,
    );

    return views.filter((view) => !view.recurrence.isArchived() || view.occurrence.isHistory());
  }
}

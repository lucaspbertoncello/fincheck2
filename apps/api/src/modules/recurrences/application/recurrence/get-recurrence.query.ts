import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// How many past occurrences the edit modal shows ("Confirmada em 25/09, 27/08 e 24/07").
const HISTORY_SIZE = 6;

// The recurrence with its history: the last 6 occurrences up to the current month, newest first
// (decision R9: months ahead do not count). Reads a deleted recurrence too.
export class GetRecurrenceQuery {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    builder: OccurrenceDtoBuilder,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.builder = builder;
    this.clock = clock;
  }

  async execute(input: GetRecurrenceQuery.Input): Promise<GetRecurrenceQuery.Output> {
    const recurrence = await requireRecurrence(this.recurrences, input.id);
    const recent = await this.occurrences.findRecentByRecurrence(
      recurrence.id,
      Month.containing(this.clock.today()),
      HISTORY_SIZE,
    );

    return { ...toRecurrenceDto(recurrence), history: await this.builder.build(recent) };
  }
}

export namespace GetRecurrenceQuery {
  export type Input = RecurrenceContract.Params;
  export type Output = RecurrenceContract.DetailDto;
}

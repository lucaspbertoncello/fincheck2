import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Pausar" (RF-REC-001): stops generating occurrences. The ones after the current month that
// nobody touched go (generating again is idempotent, so resuming brings them back); the current
// month stays (decision R8).
export class PauseRecurrenceUseCase {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: PauseRecurrenceUseCase.Input): Promise<PauseRecurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const recurrence = await requireRecurrence(this.recurrences, input.id, executor);
      recurrence.pause(this.clock.now());
      await this.recurrences.save(recurrence, executor);

      const currentMonth = Month.containing(this.clock.today());
      const all = await this.occurrences.findByRecurrenceIds([recurrence.id], undefined, executor);
      await this.occurrences.deleteByIds(
        all
          .filter(
            (occurrence) => occurrence.month.value > currentMonth.value && occurrence.isUntouched(),
          )
          .map((occurrence) => occurrence.id),
        executor,
      );

      return toRecurrenceDto(recurrence);
    });
  }
}

export namespace PauseRecurrenceUseCase {
  export type Input = RecurrenceContract.Params;
  export type Output = RecurrenceContract.Dto;
}

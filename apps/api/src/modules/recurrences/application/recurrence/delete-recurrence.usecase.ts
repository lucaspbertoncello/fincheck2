import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Excluir" (RF-REC-001): archives the recurrence. The occurrences of the current month and the
// following ones that nobody touched go; the ones with a payment or a mark, and the ones of past
// months, stay as history (decision R8). Deleting twice is the same as deleting once.
export class DeleteRecurrenceUseCase {
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

  async execute(input: DeleteRecurrenceUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const recurrence = await requireRecurrence(this.recurrences, input.id, executor);
      if (!recurrence.archive(this.clock.now())) return;
      await this.recurrences.save(recurrence, executor);

      const currentMonth = Month.containing(this.clock.today());
      const all = await this.occurrences.findByRecurrenceIds([recurrence.id], undefined, executor);
      await this.occurrences.deleteByIds(
        all
          .filter(
            (occurrence) =>
              occurrence.month.value >= currentMonth.value && occurrence.isUntouched(),
          )
          .map((occurrence) => occurrence.id),
        executor,
      );
    });
  }
}

export namespace DeleteRecurrenceUseCase {
  export type Input = RecurrenceContract.Params;
}

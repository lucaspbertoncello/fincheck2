import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { EnsureOccurrencesUseCase } from '#/modules/recurrences/application/occurrence/ensure-occurrences.usecase.ts';
import { requireRecurrence } from '#/modules/recurrences/application/recurrence/require-recurrence.util.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Voltar" of a paused recurrence: generates again, from the current month to 3 months ahead,
// without touching what exists.
export class ResumeRecurrenceUseCase {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly ensure: EnsureOccurrencesUseCase;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    ensure: EnsureOccurrencesUseCase,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.ensure = ensure;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: ResumeRecurrenceUseCase.Input): Promise<ResumeRecurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const recurrence = await requireRecurrence(this.recurrences, input.id, executor);
      recurrence.resume(this.clock.now());
      await this.recurrences.save(recurrence, executor);
      await this.ensure.execute(executor);

      return toRecurrenceDto(recurrence);
    });
  }
}

export namespace ResumeRecurrenceUseCase {
  export type Input = RecurrenceContract.Params;
  export type Output = RecurrenceContract.Dto;
}

import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { RecurrenceAmountUpdater } from '#/modules/recurrences/application/recurrence/recurrence-amount-updater.service.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Atualizar" or "Manter R$ 21,90" (BR-REC-009, RF-REC-006). Update makes the recurrence expect
// the amount received and redoes the occurrences ahead that nobody touched; the amount of this one
// does not change (the difference stays, answered). Keep only records the answer. It may be sent
// again: the last answer holds.
export class DecideOccurrenceDifferenceUseCase {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly amountUpdater: RecurrenceAmountUpdater;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    amountUpdater: RecurrenceAmountUpdater,
    builder: OccurrenceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.amountUpdater = amountUpdater;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: DecideOccurrenceDifferenceUseCase.Input,
  ): Promise<DecideOccurrenceDifferenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const occurrence = await requireOccurrence(this.occurrences, input.id, executor);
      const [view] = await this.builder.views([occurrence], executor);
      if (!view) throw new RangeError('The occurrence was not built');

      const update = input.decision === 'update';
      occurrence.decideDifference(update ? 'updated' : 'kept', view.state.difference !== null, now);
      await this.occurrences.save(occurrence, executor);
      if (update) {
        await this.amountUpdater.adoptReceivedAmount(
          {
            recurrence: view.recurrence,
            from: occurrence,
            receivedCents: view.state.receivedCents,
          },
          now,
          executor,
        );
      }

      return this.builder.buildOne(occurrence, executor);
    });
  }
}

export namespace DecideOccurrenceDifferenceUseCase {
  export type Input = OccurrenceContract.Params & OccurrenceContract.DecideDifferenceRequest;
  export type Output = OccurrenceContract.Dto;
}

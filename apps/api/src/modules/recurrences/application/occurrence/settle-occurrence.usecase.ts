import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import { requireOccurrence } from '#/modules/recurrences/application/occurrence/require-occurrence.util.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Marcar como paga ou recebida" (BR-REC-007): confirms with no transaction. No money moves: it is
// no spending and no income (Q6), it only leaves the projection.
export class SettleOccurrenceUseCase {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    occurrences: OccurrenceRepository<Kysely<Database>>,
    builder: OccurrenceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.occurrences = occurrences;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: SettleOccurrenceUseCase.Input): Promise<SettleOccurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const occurrence = await requireOccurrence(this.occurrences, input.id, executor);
      const [view] = await this.builder.views([occurrence], executor);
      occurrence.settle(view?.state.status === 'confirmed', this.clock.now());
      await this.occurrences.save(occurrence, executor);

      return this.builder.buildOne(occurrence, executor);
    });
  }
}

export namespace SettleOccurrenceUseCase {
  export type Input = OccurrenceContract.Params;
  export type Output = OccurrenceContract.Dto;
}

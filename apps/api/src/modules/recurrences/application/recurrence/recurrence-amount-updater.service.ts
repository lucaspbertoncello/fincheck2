import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// "Atualizar" a different value (BR-REC-009) and the source that follows the last amount received
// (BR-REC-014): the recurrence takes the amount received and the occurrences after this one that
// nobody touched take it too ("daqui para a frente"). The amount of this occurrence is not changed:
// the difference stays recorded. A deleted recurrence keeps its amount.
export class RecurrenceAmountUpdater {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
  }

  async adoptReceivedAmount(
    input: { recurrence: Recurrence; from: Occurrence; receivedCents: number },
    now: string,
    executor: Kysely<Database>,
  ): Promise<void> {
    const { recurrence, from } = input;
    if (recurrence.isArchived()) return;

    const amount = Money.fromCents(input.receivedCents);
    recurrence.adoptAmount(amount, now);
    await this.recurrences.save(recurrence, executor);

    const siblings = await this.occurrences.findByRecurrenceIds(
      [recurrence.id],
      undefined,
      executor,
    );
    for (const sibling of siblings) {
      if (sibling.month.value <= from.month.value || !sibling.isUntouched()) continue;
      sibling.retarget(amount, now);
      await this.occurrences.save(sibling, executor);
    }
  }
}

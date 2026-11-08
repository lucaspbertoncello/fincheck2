import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceOpener } from '#/modules/recurrences/application/occurrence/occurrence-opener.service.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// How many months after the current one get an occurrence.
const MONTHS_AHEAD = 3;

// Creates the occurrences that are missing: one per recurrence that is neither paused nor
// archived and has started, for the current month and the 3 after it. Idempotent (recurrence and
// month are unique, so running it twice, or two at once, never duplicates). The reads that depend
// on the occurrences call it first; the queries themselves never write. It also runs when the API
// starts and every day just after midnight, in case the API was off when the month turned.
//
// Inside the unit of work of a caller it uses that executor; alone, it reads without a lock and
// opens a unit of work only when there is something to write.
export class EnsureOccurrencesUseCase {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly opener: OccurrenceOpener;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    opener: OccurrenceOpener,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.opener = opener;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(executor?: Kysely<Database>): Promise<void> {
    const now = this.clock.now();
    const months = EnsureOccurrencesUseCase.monthsToCover(Month.containing(this.clock.today()));

    const active = await this.recurrences.findActive(executor);
    if (active.length === 0) return;
    const existing = await this.occurrences.findExistingKeys(months, executor);

    const fresh: Occurrence[] = [];
    for (const recurrence of active) {
      for (const month of months) {
        if (month.value < recurrence.startsMonth.value) continue;
        if (existing.has(`${recurrence.id}|${month.value}`)) continue;
        fresh.push(this.opener.open(recurrence, month, now));
      }
    }
    if (fresh.length === 0) return;

    if (executor) {
      await this.occurrences.insertMissing(fresh, executor);
    } else {
      await this.unitOfWork.run((tx) => this.occurrences.insertMissing(fresh, tx));
    }
  }

  // The current month and the three after it.
  static monthsToCover(current: Month): Month[] {
    const months = [current];
    let month = current;
    for (let step = 0; step < MONTHS_AHEAD; step++) {
      month = month.next();
      months.push(month);
    }

    return months;
  }
}

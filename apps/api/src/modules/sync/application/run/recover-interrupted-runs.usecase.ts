import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// When the API starts, no round is running: the ones that still say `running` are rounds the
// process died in the middle of (the unit of work rolled back, so nothing half done was written).
// They are closed as an error, so they do not block "Tentar agora" or show as running forever.
export class RecoverInterruptedRunsUseCase {
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(runs: RunRepository<Kysely<Database>>, clock: Clock) {
    this.runs = runs;
    this.clock = clock;
  }

  async execute(): Promise<{ recoveredCount: number }> {
    const now = this.clock.now();

    // Everything that began up to now: at start the process has just been born.
    return { recoveredCount: await this.runs.failInterrupted(now, now) };
  }
}

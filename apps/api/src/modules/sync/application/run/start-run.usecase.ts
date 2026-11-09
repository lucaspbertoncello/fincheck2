import type { Run as RunContract } from '@fincheck/shared/sync/run/run.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireConnection } from '#/modules/sync/application/connection/require-connection.util.ts';
import { RUN_STALE_AFTER_MS } from '#/modules/sync/application/run/run-limits.constant.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionDisconnectedError } from '#/modules/sync/domain/connection/sync-connection-disconnected.error.ts';
import { Run } from '#/modules/sync/domain/run/run.entity.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import { SyncRunInProgressError } from '#/modules/sync/domain/run/sync-run-in-progress.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Opens a run of a connection: it exists, is not disconnected and has no run in progress (one that
// says `running` for longer than 30 minutes is a round the API died in, and is closed as an error
// first). The row is committed before the work begins, so "Tentar agora" and the list of runs see
// it, and a second request finds the first one still running. The work is `ExecuteRunUseCase`.
export class StartRunUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.connections = connections;
    this.runs = runs;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: StartRunUseCase.Input): Promise<Run> {
    return this.unitOfWork.run(async (executor) => {
      const connection = await requireConnection(this.connections, input.connectionId, executor);
      if (connection.isDisconnected()) throw new SyncConnectionDisconnectedError();

      const now = this.clock.now();
      const staleBefore = new Date(Date.parse(now) - RUN_STALE_AFTER_MS).toISOString();
      await this.runs.failInterrupted(staleBefore, now, executor);
      if (await this.runs.findRunning(connection.id, staleBefore, executor)) {
        throw new SyncRunInProgressError();
      }

      const run = Run.start({ connectionId: connection.id, trigger: input.trigger }, now);
      await this.runs.save(run, executor);

      return run;
    });
  }
}

export namespace StartRunUseCase {
  export type Input = { connectionId: string; trigger: RunContract.Trigger };
}

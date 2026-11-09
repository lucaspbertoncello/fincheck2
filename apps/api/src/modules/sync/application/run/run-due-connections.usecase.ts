import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ExecuteRunUseCase } from '#/modules/sync/application/run/execute-run.usecase.ts';
import { RUN_EVERY_MS } from '#/modules/sync/application/run/run-limits.constant.ts';
import type { StartRunUseCase } from '#/modules/sync/application/run/start-run.usecase.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionDisconnectedError } from '#/modules/sync/domain/connection/sync-connection-disconnected.error.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import { SyncRunInProgressError } from '#/modules/sync/domain/run/sync-run-in-progress.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The scheduled round (BR-SYN-003): every connection that is not disconnected, `error` ones included
// (they recover by themselves when the same item of the Pluggy does), whose last run began more than
// an hour ago, or that never ran. One after the other, each in its own run (`trigger = schedule`).
// A connection that already has a round running is skipped, and so is everything while the gate says
// the sync is paused (the backup is restoring) or while there are no keys saved. The keys are
// decrypted (a PowerShell) only when some connection is due, once for the whole round. One failing
// connection never stops the others: the run records its own failure and what is not a failure of
// the provider is handed to `onError`. Answers how many ran.
export class RunDueConnectionsUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly credentials: CredentialsLoader;
  private readonly start: StartRunUseCase;
  private readonly execute: ExecuteRunUseCase;
  private readonly gate: SyncPauseGate;
  private readonly clock: Clock;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
    credentials: CredentialsLoader,
    start: StartRunUseCase,
    execute: ExecuteRunUseCase,
    gate: SyncPauseGate,
    clock: Clock,
  ) {
    this.connections = connections;
    this.runs = runs;
    this.credentials = credentials;
    this.start = start;
    this.execute = execute;
    this.gate = gate;
    this.clock = clock;
  }

  async run(input: { onError?: (error: unknown) => void } = {}): Promise<{ ranCount: number }> {
    if (this.gate.isPaused()) return { ranCount: 0 };

    const active = (await this.connections.list()).filter(
      (connection) => !connection.isDisconnected(),
    );
    const lastRuns = await this.runs.findLatestOf(active.map((connection) => connection.id));
    const dueBefore = Date.parse(this.clock.now()) - RUN_EVERY_MS;
    const due = active.filter((connection) => {
      const last = lastRuns.get(connection.id);

      return !last || Date.parse(last.startedAt) <= dueBefore;
    });
    if (due.length === 0) return { ranCount: 0 };
    const credentials = await this.credentials.load();
    if (credentials === null) return { ranCount: 0 };
    let ranCount = 0;

    for (const connection of due) {
      try {
        const run = await this.start.execute({ connectionId: connection.id, trigger: 'schedule' });
        await this.execute.execute({ runId: run.id, credentials });
        ranCount += 1;
      } catch (error) {
        if (error instanceof SyncRunInProgressError) continue;
        if (error instanceof SyncConnectionDisconnectedError) continue;
        input.onError?.(error);
      }
    }

    return { ranCount };
  }
}

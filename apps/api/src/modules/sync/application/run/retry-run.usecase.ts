import type { Run as RunContract } from '@fincheck/shared/sync/run/run.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireConnection } from '#/modules/sync/application/connection/require-connection.util.ts';
import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';
import type { ExecuteRunUseCase } from '#/modules/sync/application/run/execute-run.usecase.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import type { StartRunUseCase } from '#/modules/sync/application/run/start-run.usecase.ts';
import { toRunDto } from '#/modules/sync/application/run/to-run-dto.util.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionDisconnectedError } from '#/modules/sync/domain/connection/sync-connection-disconnected.error.ts';
import { SyncNotConfiguredError } from '#/modules/sync/domain/settings/sync-not-configured.error.ts';
import { SyncBackupInProgressError } from '#/modules/sync/domain/run/sync-backup-in-progress.error.ts';

// "Tentar agora" / "Buscar de novo" (RF-SYN-002, Q12): the same round of the schedule, asked by
// Lucas. It fetches again what the Pluggy already has: it does not ask the bank to update (the
// MeuPluggy does not allow it), so it may end with nothing new. Answers 202 with the run `running`;
// the result is read in the list of runs and in the state of the connection. The order of the
// errors: the connection does not exist (404), it was disconnected (422), there are no keys (422),
// a round is already running (409). While the backup restores the database (the gate is paused) it
// refuses first, before reading or writing anything, with `BACKUP_IN_PROGRESS` (409, the code the backup already has): the
// backup contract defines no answer for a request made during the restore.
export class RetryRunUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly credentials: CredentialsLoader;
  private readonly start: StartRunUseCase;
  private readonly execute: ExecuteRunUseCase;
  private readonly background: BackgroundRunner;
  private readonly gate: SyncPauseGate;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    credentials: CredentialsLoader,
    start: StartRunUseCase,
    execute: ExecuteRunUseCase,
    background: BackgroundRunner,
    gate: SyncPauseGate,
  ) {
    this.connections = connections;
    this.credentials = credentials;
    this.start = start;
    this.execute = execute;
    this.background = background;
    this.gate = gate;
  }

  async run(input: RetryRunUseCase.Input): Promise<RetryRunUseCase.Output> {
    if (this.gate.isPaused()) throw new SyncBackupInProgressError();
    const connection = await requireConnection(this.connections, input.connectionId);
    if (connection.isDisconnected()) throw new SyncConnectionDisconnectedError();
    const credentials = await this.credentials.load();
    if (credentials === null) throw new SyncNotConfiguredError();

    const run = await this.start.execute({ connectionId: connection.id, trigger: 'retry' });
    this.background.start(() => this.execute.execute({ runId: run.id, credentials }));

    return toRunDto(run);
  }
}

export namespace RetryRunUseCase {
  export type Input = { connectionId: string };
  export type Output = RunContract.Dto;
}

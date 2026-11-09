import type { Connection as ConnectionContract } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ConnectionDtoBuilder } from '#/modules/sync/application/connection/connection-dto-builder.service.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { translateProviderFailure } from '#/modules/sync/application/provider/translate-provider-failure.util.ts';
import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';
import type { ExecuteRunUseCase } from '#/modules/sync/application/run/execute-run.usecase.ts';
import { RUN_STALE_AFTER_MS } from '#/modules/sync/application/run/run-limits.constant.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionAlreadyExistsError } from '#/modules/sync/domain/connection/sync-connection-already-exists.error.ts';
import { Run } from '#/modules/sync/domain/run/run.entity.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import { SyncRunInProgressError } from '#/modules/sync/domain/run/sync-run-in-progress.error.ts';
import { SyncNotConfiguredError } from '#/modules/sync/domain/settings/sync-not-configured.error.ts';
import { SyncBackupInProgressError } from '#/modules/sync/domain/run/sync-backup-in-progress.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Conectar" (RF-ACC-002, RF-SYN-001, BR-SYN-004, BR-SYN-005): registers a bank of the Meu Pluggy,
// the same whether the item came from the widget or from the id Lucas pasted (Q10), and starts the
// first round in the background, which fetches the history. It confirms the item with the Pluggy
// before writing anything. While the backup restores the database (the gate is paused) it refuses
// first, before reading or writing, with `BACKUP_IN_PROGRESS` (409). The order of the errors: no keys (422), the Pluggy does not have the item
// (422), the keys no longer valid or the Pluggy out (422), the item already connected (409).
//
// Registering again an item that was disconnected brings it back (202, not an error): its accounts
// return to the bank in the round and the transactions match the ones they already have, without
// duplicating. An item that is `active` or in `error` is a conflict: `details` says which.
export class RegisterConnectionUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly credentials: CredentialsLoader;
  private readonly provider: BankDataProvider;
  private readonly execute: ExecuteRunUseCase;
  private readonly builder: ConnectionDtoBuilder;
  private readonly background: BackgroundRunner;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;
  private readonly gate: SyncPauseGate;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
    credentials: CredentialsLoader,
    provider: BankDataProvider,
    execute: ExecuteRunUseCase,
    builder: ConnectionDtoBuilder,
    background: BackgroundRunner,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
    gate: SyncPauseGate,
  ) {
    this.connections = connections;
    this.runs = runs;
    this.credentials = credentials;
    this.provider = provider;
    this.execute = execute;
    this.builder = builder;
    this.background = background;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
    this.gate = gate;
  }

  async register(
    input: RegisterConnectionUseCase.Input,
  ): Promise<RegisterConnectionUseCase.Output> {
    if (this.gate.isPaused()) throw new SyncBackupInProgressError();
    const credentials = await this.credentials.load();
    if (credentials === null) throw new SyncNotConfiguredError();

    const existing = await this.connections.findByPluggyItemId(input.pluggyItemId);
    if (existing && !existing.isDisconnected()) {
      throw new SyncConnectionAlreadyExistsError(
        existing.id,
        existing.status as 'active' | 'error',
      );
    }
    let item: BankDataProvider.Item;
    try {
      item = await this.provider.getItem(credentials, input.pluggyItemId);
    } catch (error) {
      throw translateProviderFailure(error);
    }

    const { connection, run } = await this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const found = await this.connections.findByPluggyItemId(input.pluggyItemId, executor);
      if (found && !found.isDisconnected()) {
        throw new SyncConnectionAlreadyExistsError(found.id, found.status as 'active' | 'error');
      }
      const staleBefore = new Date(Date.parse(now) - RUN_STALE_AFTER_MS).toISOString();
      if (found && (await this.runs.findRunning(found.id, staleBefore, executor))) {
        throw new SyncRunInProgressError();
      }

      const connection =
        found ??
        Connection.register(
          {
            pluggyItemId: input.pluggyItemId,
            institutionCode: item.institutionCode,
            institutionName: item.institutionName,
            lastBankUpdateAt: item.lastUpdatedAt,
          },
          now,
        );
      if (found) found.reactivate({ lastBankUpdateAt: item.lastUpdatedAt }, now);
      await this.connections.save(connection, executor);

      const run = Run.start({ connectionId: connection.id, trigger: 'first_connection' }, now);
      await this.runs.save(run, executor);

      return { connection, run };
    });
    // The answer shows the round as it began (`running`, no account yet): it is built before the round
    // goes on.
    const answer = await this.builder.buildOne(connection);
    this.background.start(() => this.execute.execute({ runId: run.id, credentials }));

    return answer;
  }
}

export namespace RegisterConnectionUseCase {
  export type Input = ConnectionContract.CreateRequest;
  export type Output = ConnectionContract.Dto;
}

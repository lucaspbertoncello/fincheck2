import type { Connection as ConnectionContract } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ImportConnectionUseCase } from '#/modules/sync/application/import/import-connection.usecase.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import {
  ITEM_WAIT_ATTEMPTS,
  ITEM_WAIT_DELAY_MS,
  RUNS_KEPT,
} from '#/modules/sync/application/run/run-limits.constant.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { judgeItem } from '#/modules/sync/domain/connection/judge-item.util.ts';
import { computeFetchFrom } from '#/modules/sync/domain/import/compute-fetch-from.util.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The round: reads the Pluggy and imports it. It begins with the item (what the Pluggy says of the
// connection, `judgeItem`): an error it declared, or no news from the bank for three days, ends the
// run as an error and moves the connection to `error` (BR-SYN-004); a bank still being read makes
// the round wait a little when someone is waiting (first connection, "Tentar agora") and otherwise
// closes the run as `success` with nothing imported, without moving the connection (a bank that
// really stopped shows as `STALE_DATA` at 3 days), and leaves it for the next hour. Then it fetches everything it needs from the Pluggy (accounts, the
// transactions of each from its cursor minus 30 days, the invoices the bank closed): the network is
// over before the unit of work begins, because a transaction of the database is held for as long as
// it lasts. Only then does `ImportConnectionUseCase` write, all or nothing, with the run and the
// connection in the same commit. A failure to reach the Pluggy ends the run as `PROVIDER_ERROR`
// without moving a connection that was working. Nothing the Pluggy said and no key reaches the
// run or a log.
export class ExecuteRunUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly credentials: CredentialsLoader;
  private readonly provider: BankDataProvider;
  private readonly importConnection: ImportConnectionUseCase;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly gate: SyncPauseGate;
  private readonly clock: Clock;
  private readonly wait: ExecuteRunUseCase.Wait;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
    credentials: CredentialsLoader,
    provider: BankDataProvider,
    importConnection: ImportConnectionUseCase,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    gate: SyncPauseGate,
    clock: Clock,
    wait: ExecuteRunUseCase.Wait = {
      attempts: ITEM_WAIT_ATTEMPTS,
      delayMs: ITEM_WAIT_DELAY_MS,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  ) {
    this.connections = connections;
    this.runs = runs;
    this.credentials = credentials;
    this.provider = provider;
    this.importConnection = importConnection;
    this.unitOfWork = unitOfWork;
    this.gate = gate;
    this.clock = clock;
    this.wait = wait;
  }

  async execute(input: ExecuteRunUseCase.Input): Promise<void> {
    // The backup is restoring the database: nothing is read or written now, not even the failure of
    // this run. The run stays `running` and is closed as interrupted by the next round or at start.
    if (this.gate.isPaused()) return;
    const run = await this.runs.findById(input.runId);
    if (!run?.isRunning()) return;
    const connection = await this.connections.findById(run.connectionId);
    if (!connection) return;

    // The caller that already decrypted the keys hands them over: each decryption is a PowerShell.
    const credentials = input.credentials ?? (await this.credentials.load());
    if (credentials === null) {
      await this.fail(run.id, connection.id, { code: 'PROVIDER_ERROR', declaredByProvider: false });
      return;
    }

    try {
      let item = await this.provider.getItem(credentials, connection.pluggyItemId);
      let verdict = judgeItem(item, this.clock.now());
      for (
        let look = 0;
        verdict.type === 'updating' && run.trigger !== 'schedule' && look < this.wait.attempts;
        look++
      ) {
        await this.wait.sleep(this.wait.delayMs);
        item = await this.provider.getItem(credentials, connection.pluggyItemId);
        verdict = judgeItem(item, this.clock.now());
      }

      if (verdict.type === 'failed') {
        await this.fail(run.id, connection.id, { code: verdict.code, declaredByProvider: true });
        return;
      }
      if (verdict.type === 'updating') {
        // Still being read: nothing came to be imported, and nothing is wrong either. The run ends
        // `success` with zero counts and the connection is not touched; the next hour reads it, and a
        // bank that really stopped shows as `STALE_DATA` at 3 days.
        await this.finishQuietly(run.id, connection.id);
        return;
      }

      const fetched = await this.fetch(credentials, connection, item);
      await this.unitOfWork.run((executor) =>
        this.importConnection.execute(
          {
            connectionId: connection.id,
            runId: run.id,
            item: fetched.item,
            accounts: fetched.accounts,
          },
          executor,
        ),
      );
    } catch (error) {
      await this.fail(run.id, connection.id, { code: 'PROVIDER_ERROR', declaredByProvider: false });
      // A failure of the provider is already in the run; anything else is a bug for the caller to log.
      if (!(error instanceof BankProviderError)) throw error;
    }
  }

  private async fetch(
    credentials: BankDataProvider.Credentials,
    connection: Connection,
    item: BankDataProvider.Item,
  ): Promise<{ item: BankDataProvider.Item; accounts: ImportConnectionUseCase.FetchedAccount[] }> {
    const today = this.clock.today();
    const accounts: ImportConnectionUseCase.FetchedAccount[] = [];

    for (const account of await this.provider.listAccounts(credentials, connection.pluggyItemId)) {
      const link = connection.linkOf(account.id);
      // An account that waits for Lucas to choose is not imported: nothing to fetch for it.
      if (link?.isPending()) {
        accounts.push({ account, fromOn: today.value, transactions: [], invoices: [] });
        continue;
      }
      const fromOn = computeFetchFrom(link?.cursorOn ?? null, today);
      accounts.push({
        account,
        fromOn,
        transactions: await this.provider.listTransactions(credentials, account.id, fromOn),
        invoices:
          account.type === 'credit_card'
            ? await this.provider.listInvoices(credentials, account.id)
            : [],
      });
    }

    return { item, accounts };
  }

  private async finishQuietly(runId: string, connectionId: string): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const run = await this.runs.findById(runId, executor);
      if (run?.isRunning()) {
        run.succeed({ createdCount: 0, updatedCount: 0, removedCount: 0 }, this.clock.now());
        await this.runs.save(run, executor);
      }
      await this.runs.trim(connectionId, RUNS_KEPT, executor);
    });
  }

  // The run ends as an error. `declaredByProvider` moves the connection to `error` (it said so);
  // otherwise a connection that was working is left as it was (see `Connection.recordFailure`).
  // A connection that was disconnected meanwhile is left alone.
  private async fail(
    runId: string,
    connectionId: string,
    input: { code: ConnectionContract.ErrorCode; declaredByProvider: boolean },
  ): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const run = await this.runs.findById(runId, executor);
      if (run?.isRunning()) {
        run.fail(input.code, now);
        await this.runs.save(run, executor);
      }
      const connection = await this.connections.findById(connectionId, executor);
      if (connection && !connection.isDisconnected()) {
        connection.recordFailure(
          { code: input.code, declaredByProvider: input.declaredByProvider },
          now,
        );
        await this.connections.save(connection, executor);
      }
      await this.runs.trim(connectionId, RUNS_KEPT, executor);
    });
  }
}

export namespace ExecuteRunUseCase {
  // `credentials`: the keys, when the caller already decrypted them for this round.
  export type Input = { runId: string; credentials?: BankDataProvider.Credentials };

  // How long the round waits for a bank the Pluggy is still reading: `attempts` looks, `delayMs`
  // apart. The `sleep` is a parameter so a test does not wait.
  export type Wait = {
    attempts: number;
    delayMs: number;
    sleep: (ms: number) => Promise<void>;
  };
}

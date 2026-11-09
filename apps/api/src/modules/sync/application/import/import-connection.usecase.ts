import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BankAccountImporter } from '#/modules/sync/application/import/bank-account-importer.service.ts';
import type { BankTransactionImporter } from '#/modules/sync/application/import/bank-transaction-importer.service.ts';
import type { ImportRuleApplier } from '#/modules/sync/application/import/import-rule-applier.service.ts';
import type { NatureDetectionRunner } from '#/modules/sync/application/import/nature-detection-runner.service.ts';
import type { SyncInvoices } from '#/modules/sync/application/import/sync-invoices.interface.ts';
import type { SyncRecurrences } from '#/modules/sync/application/import/sync-recurrences.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncConnectionDisconnectedError } from '#/modules/sync/domain/connection/sync-connection-disconnected.error.ts';
import { SyncConnectionNotFoundError } from '#/modules/sync/domain/connection/sync-connection-not-found.error.ts';
import { RUNS_KEPT } from '#/modules/sync/application/run/run-limits.constant.ts';
import type { Run } from '#/modules/sync/domain/run/run.entity.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What a round of the sync does with what the Pluggy sent (`domain model.md` 5.2 and 5.3), in one
// unit of work, so it all commits or none of it does: accounts and balances (with the adoption of an
// old account), the total of the invoices the bank closed, the transactions of each account (the
// match of 4.8), the detectors (payment of invoice, then transfer), the rules of category, the
// match with the occurrences of the recurrences, and the state of the connection and of the run. The
// owners do their own part (`accounts`, `invoices`, `transactions`, `categories`, `recurrences`)
// through ports, in the same unit of work. The network is over before it starts: it only receives
// what was fetched. The detectors, the rules and the match only look at the new transactions of the
// round, so a transaction Lucas edited is never touched by them.
export class ImportConnectionUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly accountImporter: BankAccountImporter;
  private readonly invoices: SyncInvoices;
  private readonly transactionImporter: BankTransactionImporter;
  private readonly detection: NatureDetectionRunner;
  private readonly ruleApplier: ImportRuleApplier;
  private readonly recurrences: SyncRecurrences;
  private readonly clock: Clock;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    runs: RunRepository<Kysely<Database>>,
    accountImporter: BankAccountImporter,
    invoices: SyncInvoices,
    transactionImporter: BankTransactionImporter,
    detection: NatureDetectionRunner,
    ruleApplier: ImportRuleApplier,
    recurrences: SyncRecurrences,
    clock: Clock,
  ) {
    this.connections = connections;
    this.runs = runs;
    this.accountImporter = accountImporter;
    this.invoices = invoices;
    this.transactionImporter = transactionImporter;
    this.detection = detection;
    this.ruleApplier = ruleApplier;
    this.recurrences = recurrences;
    this.clock = clock;
  }

  async execute(
    input: ImportConnectionUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<Run.Counts> {
    const now = this.clock.now();
    const today = this.clock.today().value;
    const connection = await this.connections.findById(input.connectionId, executor);
    if (!connection) throw new SyncConnectionNotFoundError();
    // Disconnected while the round was fetching: nothing is written (the unit of work rolls back).
    if (connection.isDisconnected()) throw new SyncConnectionDisconnectedError();

    const imported = await this.accountImporter.import(connection, input.accounts, executor);

    for (const account of imported.filter((item) => item.isCard)) {
      await this.invoices.recordBankTotals(
        {
          accountId: account.accountId,
          bills: account.fetched.invoices.map((invoice) => ({
            dueOn: invoice.dueOn,
            totalCents: invoice.totalCents,
          })),
        },
        executor,
      );
    }

    const created: SyncTransactions.Created[] = [];
    let updatedCount = 0;
    let removedCount = 0;
    let oldestOn: string | null = null;
    for (const account of imported) {
      const result = await this.transactionImporter.import(account, executor);
      created.push(...result.created);
      updatedCount += result.updatedCount;
      removedCount += result.removedCount;
      if (result.oldestOn !== null && (oldestOn === null || result.oldestOn < oldestOn)) {
        oldestOn = result.oldestOn;
      }
      const link = connection.accountLinks.find(
        (candidate) => candidate.accountId === account.accountId,
      );
      if (link) connection.putLink(link.withCursor(today));
    }

    const natures = await this.detection.run(created, executor);
    await this.ruleApplier.apply(created, natures, executor);
    const countable = created
      .filter((item) => ['expense', 'income'].includes(natures.get(item.transactionId) ?? ''))
      .map((item) => item.transactionId);
    if (countable.length > 0) {
      await this.recurrences.autoMatch({ transactionIds: countable }, executor);
    }

    connection.recordSuccess(
      { lastBankUpdateAt: input.item.lastUpdatedAt, oldestTransactionOn: oldestOn },
      now,
    );
    await this.connections.save(connection, executor);

    const counts = { createdCount: created.length, updatedCount, removedCount };
    const run = await this.runs.findById(input.runId, executor);
    if (run?.isRunning()) {
      run.succeed(counts, now);
      await this.runs.save(run, executor);
    }
    await this.runs.trim(connection.id, RUNS_KEPT, executor);

    return counts;
  }
}

export namespace ImportConnectionUseCase {
  export type FetchedAccount = {
    account: BankDataProvider.Account;
    // The first day asked for the transactions of this account.
    fromOn: string;
    transactions: BankDataProvider.Transaction[];
    // Only the invoices the bank closed, only on a card.
    invoices: BankDataProvider.Invoice[];
  };

  export type Input = {
    connectionId: string;
    runId: string;
    item: BankDataProvider.Item;
    accounts: FetchedAccount[];
  };
}

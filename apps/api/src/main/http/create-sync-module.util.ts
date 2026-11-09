import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { AdoptionCandidateFinder } from '#/modules/sync/application/connection/adoption-candidate-finder.service.ts';
import { ConnectionDtoBuilder } from '#/modules/sync/application/connection/connection-dto-builder.service.ts';
import { CreateConnectTokenUseCase } from '#/modules/sync/application/connection/create-connect-token.usecase.ts';
import { DisconnectConnectionUseCase } from '#/modules/sync/application/connection/disconnect-connection.usecase.ts';
import { ListConnectionsQuery } from '#/modules/sync/application/connection/list-connections.query.ts';
import { RegisterConnectionUseCase } from '#/modules/sync/application/connection/register-connection.usecase.ts';
import { ResolveAccountMatchesUseCase } from '#/modules/sync/application/connection/resolve-account-matches.usecase.ts';
import type { SyncBalance } from '#/modules/sync/application/connection/sync-balance.interface.ts';
import { BankAccountImporter } from '#/modules/sync/application/import/bank-account-importer.service.ts';
import { BankTransactionImporter } from '#/modules/sync/application/import/bank-transaction-importer.service.ts';
import { ImportConnectionUseCase } from '#/modules/sync/application/import/import-connection.usecase.ts';
import { ImportRuleApplier } from '#/modules/sync/application/import/import-rule-applier.service.ts';
import { NatureDetectionRunner } from '#/modules/sync/application/import/nature-detection-runner.service.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { SyncInvoices } from '#/modules/sync/application/import/sync-invoices.interface.ts';
import type { SyncRecurrences } from '#/modules/sync/application/import/sync-recurrences.interface.ts';
import type { SyncRules } from '#/modules/sync/application/import/sync-rules.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';
import { ExecuteRunUseCase } from '#/modules/sync/application/run/execute-run.usecase.ts';
import { ListRunsQuery } from '#/modules/sync/application/run/list-runs.query.ts';
import { RecoverInterruptedRunsUseCase } from '#/modules/sync/application/run/recover-interrupted-runs.usecase.ts';
import { RetryRunUseCase } from '#/modules/sync/application/run/retry-run.usecase.ts';
import { RunDueConnectionsUseCase } from '#/modules/sync/application/run/run-due-connections.usecase.ts';
import { StartRunUseCase } from '#/modules/sync/application/run/start-run.usecase.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import { GetSyncSettingsQuery } from '#/modules/sync/application/settings/get-sync-settings.query.ts';
import { SaveSyncSettingsUseCase } from '#/modules/sync/application/settings/save-sync-settings.usecase.ts';
import type { SecretCipher } from '#/modules/sync/application/settings/secret-cipher.interface.ts';
import { CreateConnectTokenController } from '#/modules/sync/http/connect-token/create-connect-token.controller.ts';
import { createConnectTokenRoute } from '#/modules/sync/http/connect-token/connect-token.route.ts';
import { createConnectionRoute } from '#/modules/sync/http/connection/connection.route.ts';
import { DisconnectConnectionController } from '#/modules/sync/http/connection/disconnect-connection.controller.ts';
import { ListConnectionsController } from '#/modules/sync/http/connection/list-connections.controller.ts';
import { RegisterConnectionController } from '#/modules/sync/http/connection/register-connection.controller.ts';
import { ResolveAccountMatchesController } from '#/modules/sync/http/connection/resolve-account-matches.controller.ts';
import { ListRunsController } from '#/modules/sync/http/run/list-runs.controller.ts';
import { RetryRunController } from '#/modules/sync/http/run/retry-run.controller.ts';
import { createRunRoute } from '#/modules/sync/http/run/run.route.ts';
import { GetSyncSettingsController } from '#/modules/sync/http/settings/get-sync-settings.controller.ts';
import { SaveSyncSettingsController } from '#/modules/sync/http/settings/save-sync-settings.controller.ts';
import { createSyncSettingsRoute } from '#/modules/sync/http/settings/settings.route.ts';
import { KyselyConnectionRepository } from '#/modules/sync/infra/connection/connection.repository.ts';
import { KyselyTransactionLinkStore } from '#/modules/sync/infra/import/transaction-link.store.ts';
import { KyselyRunRepository } from '#/modules/sync/infra/run/run.repository.ts';
import { KyselySyncSettingsRepository } from '#/modules/sync/infra/settings/sync-settings.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `sync` module by hand: the routes (settings, connect token, connections, runs) and the
// use cases the tasks of the API call (the scheduled round and the recovery at start). It sits
// at the end of the composition because it asks every other owner, through ports: `accounts` (create,
// refresh and hand back to manual), `transactions` (create, update, remove, set natures and
// categories, read), `invoices` (the total of the bank, the invoices to pay), `categories` (the rules)
// and `recurrences` (the automatic match). The provider of the bank data (the Pluggy), the cipher of
// the secret, the gate of the backup and the runner of the background rounds come in, so a test
// puts doubles where the real ones talk to the network, to PowerShell or to a timer.
export function createSyncModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  provider: BankDataProvider;
  cipher: SecretCipher;
  pauseGate: SyncPauseGate;
  background: BackgroundRunner;
  wait?: ExecuteRunUseCase.Wait;
  accounts: SyncAccounts;
  transactions: SyncTransactions;
  invoices: SyncInvoices;
  rules: SyncRules;
  recurrences: SyncRecurrences;
  balance: SyncBalance;
}) {
  const { db, unitOfWork, clock, provider } = deps;

  const settings = new KyselySyncSettingsRepository(db);
  const connections = new KyselyConnectionRepository(db);
  const runs = new KyselyRunRepository(db);
  const links = new KyselyTransactionLinkStore(db);
  const credentials = new CredentialsLoader(settings, deps.cipher);
  const candidates = new AdoptionCandidateFinder(deps.accounts, connections);
  const builder = new ConnectionDtoBuilder(
    deps.accounts,
    deps.transactions,
    runs,
    candidates,
    clock,
  );
  const listConnections = new ListConnectionsQuery(connections, builder);

  const accountImporter = new BankAccountImporter(deps.accounts, candidates, connections);
  const importConnection = new ImportConnectionUseCase(
    connections,
    runs,
    accountImporter,
    deps.invoices,
    new BankTransactionImporter(deps.transactions, links, clock),
    new NatureDetectionRunner(deps.transactions, deps.invoices),
    new ImportRuleApplier(deps.rules, deps.transactions),
    deps.recurrences,
    clock,
  );
  const execute = new ExecuteRunUseCase(
    connections,
    runs,
    credentials,
    provider,
    importConnection,
    unitOfWork,
    deps.pauseGate,
    clock,
    deps.wait,
  );
  const start = new StartRunUseCase(connections, runs, unitOfWork, clock);

  const routes = new Hono()
    .route(
      '/',
      createSyncSettingsRoute({
        getSettings: new GetSyncSettingsController(new GetSyncSettingsQuery(settings, credentials)),
        saveSettings: new SaveSyncSettingsController(
          new SaveSyncSettingsUseCase(settings, provider, deps.cipher, clock),
        ),
      }),
    )
    .route(
      '/',
      createConnectTokenRoute({
        createConnectToken: new CreateConnectTokenController(
          new CreateConnectTokenUseCase(credentials, provider),
        ),
      }),
    )
    .route(
      '/',
      createConnectionRoute({
        listConnections: new ListConnectionsController(listConnections),
        registerConnection: new RegisterConnectionController(
          new RegisterConnectionUseCase(
            connections,
            runs,
            credentials,
            provider,
            execute,
            builder,
            deps.background,
            unitOfWork,
            clock,
            deps.pauseGate,
          ),
        ),
        resolveAccountMatches: new ResolveAccountMatchesController(
          new ResolveAccountMatchesUseCase(
            connections,
            candidates,
            credentials,
            provider,
            deps.accounts,
            accountImporter,
            start,
            execute,
            deps.background,
            builder,
            unitOfWork,
            deps.pauseGate,
          ),
        ),
        disconnectConnection: new DisconnectConnectionController(
          new DisconnectConnectionUseCase(
            connections,
            deps.accounts,
            deps.balance,
            unitOfWork,
            clock,
          ),
        ),
      }),
    )
    .route(
      '/',
      createRunRoute({
        listRuns: new ListRunsController(new ListRunsQuery(connections, runs)),
        retryRun: new RetryRunController(
          new RetryRunUseCase(
            connections,
            credentials,
            start,
            execute,
            deps.background,
            deps.pauseGate,
          ),
        ),
      }),
    );

  return {
    routes,
    // The tasks of the API: the scheduled round, and the closing of the rounds the last process died in.
    runDueConnections: new RunDueConnectionsUseCase(
      connections,
      runs,
      credentials,
      start,
      execute,
      deps.pauseGate,
      clock,
    ),
    recoverInterruptedRuns: new RecoverInterruptedRunsUseCase(runs, clock),
    // The reader `dashboard` declares and `sync` fulfils: the connections, for the freshness seal
    // and the alerts. It reads the list `GET /connections` already shows, and keeps four fields.
    dashboardReaders: {
      connections: {
        async listConnections() {
          const { items } = await listConnections.execute();
          return items.map((item) => ({
            connectionId: item.id,
            institutionName: item.institutionName,
            status: item.status,
            lastBankUpdateAt: item.lastBankUpdateAt,
          }));
        },
      },
    },
  };
}

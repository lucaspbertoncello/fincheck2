import type { Connection as ConnectionContract } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AdoptionCandidateFinder } from '#/modules/sync/application/connection/adoption-candidate-finder.service.ts';
import type { ConnectionDtoBuilder } from '#/modules/sync/application/connection/connection-dto-builder.service.ts';
import { requireConnection } from '#/modules/sync/application/connection/require-connection.util.ts';
import type { BankAccountImporter } from '#/modules/sync/application/import/bank-account-importer.service.ts';
import type { ImportConnectionUseCase } from '#/modules/sync/application/import/import-connection.usecase.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { translateProviderFailure } from '#/modules/sync/application/provider/translate-provider-failure.util.ts';
import type { BackgroundRunner } from '#/modules/sync/application/run/background-runner.interface.ts';
import type { ExecuteRunUseCase } from '#/modules/sync/application/run/execute-run.usecase.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import type { StartRunUseCase } from '#/modules/sync/application/run/start-run.usecase.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import type { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { SyncAccountMatchInvalidError } from '#/modules/sync/domain/connection/sync-account-match-invalid.error.ts';
import { SyncConnectionDisconnectedError } from '#/modules/sync/domain/connection/sync-connection-disconnected.error.ts';
import { SyncRunInProgressError } from '#/modules/sync/domain/run/sync-run-in-progress.error.ts';
import { SyncNotConfiguredError } from '#/modules/sync/domain/settings/sync-not-configured.error.ts';
import { SyncBackupInProgressError } from '#/modules/sync/domain/run/sync-backup-in-progress.error.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Lucas picks, on a reconnection, which account he already has each account of the Pluggy is (it
// only waits when there was more than one candidate), or says it is a new one (`accountId` null).
// Each choice has to be a link that is waiting and, when it names an account, one of the candidates
// the rule offers; a repeated account or Pluggy account is invalid too (422 `SYNC_ACCOUNT_MATCH_INVALID`).
// The account chosen takes the link (the account goes back to the bank in the round); a new one is
// created with what the Pluggy says of it now, read before the unit of work. Then the account is
// imported by a round in the background, which matches the history it brings with what the account
// already has (4.8, step 3). Answers 202 with the connection; with no choice at all there is nothing
// to import and no round is opened. While the backup restores the database (the gate is paused) it
// refuses first, before reading or writing, with `BACKUP_IN_PROGRESS` (409).
export class ResolveAccountMatchesUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly candidates: AdoptionCandidateFinder;
  private readonly credentials: CredentialsLoader;
  private readonly provider: BankDataProvider;
  private readonly accounts: SyncAccounts;
  private readonly accountImporter: BankAccountImporter;
  private readonly start: StartRunUseCase;
  private readonly execute: ExecuteRunUseCase;
  private readonly background: BackgroundRunner;
  private readonly builder: ConnectionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly gate: SyncPauseGate;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    candidates: AdoptionCandidateFinder,
    credentials: CredentialsLoader,
    provider: BankDataProvider,
    accounts: SyncAccounts,
    accountImporter: BankAccountImporter,
    start: StartRunUseCase,
    execute: ExecuteRunUseCase,
    background: BackgroundRunner,
    builder: ConnectionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    gate: SyncPauseGate,
  ) {
    this.connections = connections;
    this.candidates = candidates;
    this.credentials = credentials;
    this.provider = provider;
    this.accounts = accounts;
    this.accountImporter = accountImporter;
    this.start = start;
    this.execute = execute;
    this.background = background;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.gate = gate;
  }

  async resolve(
    input: ResolveAccountMatchesUseCase.Input,
  ): Promise<ResolveAccountMatchesUseCase.Output> {
    if (this.gate.isPaused()) throw new SyncBackupInProgressError();
    const connection = await requireConnection(this.connections, input.connectionId);
    if (connection.isDisconnected()) throw new SyncConnectionDisconnectedError();

    const chosen = new Set<string>();
    const seen = new Set<string>();
    const picks: { link: AccountLink; accountId: string | null }[] = [];
    for (const match of input.matches) {
      const link = connection.linkOf(match.pluggyAccountId);
      if (!link?.isPending() || seen.has(match.pluggyAccountId)) {
        throw new SyncAccountMatchInvalidError();
      }
      seen.add(match.pluggyAccountId);
      if (match.accountId !== null) {
        const found = await this.candidates.find({
          institutionCode: connection.institutionCode,
          institutionName: connection.institutionName,
          type: link.pluggyType,
          numberHint: link.numberHint,
        });
        if (chosen.has(match.accountId) || !found.some((c) => c.accountId === match.accountId)) {
          throw new SyncAccountMatchInvalidError();
        }
        chosen.add(match.accountId);
      }
      picks.push({ link, accountId: match.accountId });
    }

    // Nothing chosen, nothing to import: no round is opened for it.
    if (picks.length === 0) return this.builder.buildOne(connection);

    // A new account is made from what the Pluggy says of it now.
    const createInputs = new Map<string, SyncAccounts.CreateInput>();
    const toCreate = picks.filter((pick) => pick.accountId === null);
    if (toCreate.length > 0) {
      const credentials = await this.credentials.load();
      if (credentials === null) throw new SyncNotConfiguredError();
      try {
        const listed = await this.provider.listAccounts(credentials, connection.pluggyItemId);
        for (const pick of toCreate) {
          const account = listed.find((candidate) => candidate.id === pick.link.pluggyAccountId);
          if (!account) throw new SyncAccountMatchInvalidError();
          const fetched: ImportConnectionUseCase.FetchedAccount = {
            account,
            fromOn: '',
            transactions: [],
            invoices:
              account.type === 'credit_card'
                ? await this.provider.listInvoices(credentials, account.id)
                : [],
          };
          createInputs.set(
            pick.link.pluggyAccountId,
            this.accountImporter.buildCreateInput(connection, fetched),
          );
        }
      } catch (error) {
        throw translateProviderFailure(error);
      }
    }

    await this.unitOfWork.run(async (executor) => {
      const current = await requireConnection(this.connections, connection.id, executor);
      for (const pick of picks) {
        let accountId = pick.accountId;
        if (accountId === null) {
          const createInput = createInputs.get(pick.link.pluggyAccountId);
          if (!createInput) throw new SyncAccountMatchInvalidError();
          accountId = (await this.accounts.create(createInput, executor)).accountId;
        } else {
          await this.connections.releaseAccounts([accountId], executor);
          current.unlinkAccount(accountId);
        }
        const waiting = current.linkOf(pick.link.pluggyAccountId);
        if (!waiting?.isPending()) throw new SyncAccountMatchInvalidError();
        current.putLink(waiting.withAccount(accountId));
      }
      await this.connections.save(current, executor);
    });

    // The accounts chosen are imported by a round (it is skipped, not an error, when one is running).
    let started: string | null = null;
    try {
      started = (await this.start.execute({ connectionId: connection.id, trigger: 'retry' })).id;
    } catch (error) {
      if (!(error instanceof SyncRunInProgressError)) throw error;
    }

    const answer = await this.builder.buildOne(
      await requireConnection(this.connections, connection.id),
    );
    if (started !== null) {
      const runId = started;
      this.background.start(() => this.execute.execute({ runId }));
    }

    return answer;
  }
}

export namespace ResolveAccountMatchesUseCase {
  export type Input = { connectionId: string } & ConnectionContract.ResolveMatchesRequest;
  export type Output = ConnectionContract.Dto;
}

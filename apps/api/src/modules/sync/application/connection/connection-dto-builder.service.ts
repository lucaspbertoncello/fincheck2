import type { Connection as ConnectionContract } from '@fincheck/shared/sync/connection/connection.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AdoptionCandidateFinder } from '#/modules/sync/application/connection/adoption-candidate-finder.service.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { RunRepository } from '#/modules/sync/domain/run/run-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

const TYPE_ORDER = ['checking', 'savings', 'wallet', 'credit_card'] as const;
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// Builds the `Connection.Dto` of the contract. Everything the connection does not hold itself is
// read from the owners: the name and type of its accounts (`accounts`), how many transactions it
// brought (`transactions`), the most recent run (the runs) and the candidates of the accounts that
// wait for Lucas to choose. `isStale` is worked out now, never stored. Never carries the id of the
// Pluggy of anything.
export class ConnectionDtoBuilder {
  private readonly accounts: SyncAccounts;
  private readonly transactions: SyncTransactions;
  private readonly runs: RunRepository<Kysely<Database>>;
  private readonly candidates: AdoptionCandidateFinder;
  private readonly clock: Clock;

  constructor(
    accounts: SyncAccounts,
    transactions: SyncTransactions,
    runs: RunRepository<Kysely<Database>>,
    candidates: AdoptionCandidateFinder,
    clock: Clock,
  ) {
    this.accounts = accounts;
    this.transactions = transactions;
    this.runs = runs;
    this.candidates = candidates;
    this.clock = clock;
  }

  async build(
    connections: Connection[],
    executor?: Kysely<Database>,
  ): Promise<ConnectionContract.Dto[]> {
    const now = this.clock.now();
    const summaries = await this.accounts.summaries(
      connections.flatMap((connection) =>
        connection.accountLinks.flatMap((link) => (link.accountId ? [link.accountId] : [])),
      ),
      executor,
    );
    const lastRuns = await this.runs.findLatestOf(
      connections.map((connection) => connection.id),
      executor,
    );

    const dtos: ConnectionContract.Dto[] = [];
    for (const connection of connections) {
      const linked = connection.accountLinks.flatMap((link) => {
        const summary = link.accountId ? summaries.get(link.accountId) : undefined;

        return summary ? [summary] : [];
      });
      const lastRun = lastRuns.get(connection.id);
      const pending = [];
      for (const link of connection.accountLinks.filter((candidate) => candidate.isPending())) {
        const found = await this.candidates.find(
          {
            institutionCode: connection.institutionCode,
            institutionName: connection.institutionName,
            type: link.pluggyType,
            numberHint: link.numberHint,
          },
          executor,
        );
        pending.push({
          pluggyAccountId: link.pluggyAccountId,
          name: link.pluggyName,
          type: link.pluggyType,
          numberHint: link.numberHint,
          candidates: found.map((candidate) => ({
            accountId: candidate.accountId,
            name: candidate.name,
            type: candidate.type,
            source: candidate.source,
          })),
        });
      }

      dtos.push({
        id: connection.id,
        institutionCode: connection.institutionCode,
        institutionName: connection.institutionName,
        status: connection.status,
        errorCode: connection.status === 'error' ? connection.errorCode : null,
        lastBankUpdateAt: connection.lastBankUpdateAt,
        lastSuccessAt: connection.lastSuccessAt,
        isStale: connection.isStale(now),
        history: {
          status: connection.historyStatus,
          fromOn: connection.historyFromOn,
          transactionCount: await this.transactions.countBank(
            linked.map((summary) => summary.accountId),
            executor,
          ),
        },
        accounts: linked
          .toSorted(
            (a, b) =>
              TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
              nameCollator.compare(a.name, b.name),
          )
          .flatMap((summary) =>
            summary.type === 'wallet'
              ? []
              : [{ accountId: summary.accountId, name: summary.name, type: summary.type }],
          ),
        lastRun: lastRun
          ? {
              id: lastRun.id,
              trigger: lastRun.trigger,
              status: lastRun.status,
              startedAt: lastRun.startedAt,
              finishedAt: lastRun.finishedAt,
              errorCode: lastRun.errorCode,
            }
          : null,
        pendingAccountMatches: pending,
      });
    }

    return dtos;
  }

  async buildOne(
    connection: Connection,
    executor?: Kysely<Database>,
  ): Promise<ConnectionContract.Dto> {
    const [dto] = await this.build([connection], executor);
    if (!dto) throw new Error('The builder returned no connection');

    return dto;
  }
}

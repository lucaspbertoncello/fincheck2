import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireConnection } from '#/modules/sync/application/connection/require-connection.util.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { SyncBalance } from '#/modules/sync/application/connection/sync-balance.interface.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desconectar" (Q8, BR-ACC-006, BR-ACC-007), in one unit of work: the connection goes to
// `disconnected` and stops being read; every account it had becomes manual (the bank balance leaves),
// and on the ones that are not a card the balance opens at the last one the bank informed, through a
// `balance_adjustment` of today with the difference between it and the sum of the transactions. The
// links to the accounts and to the transactions stay: they match the accounts and the transactions
// again if Lucas reconnects, without duplicating. The Pluggy is not called (revoking the access is in
// the Meu Pluggy). Repeating it on a connection already disconnected changes nothing.
export class DisconnectConnectionUseCase {
  private readonly connections: ConnectionRepository<Kysely<Database>>;
  private readonly accounts: SyncAccounts;
  private readonly balance: SyncBalance;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    connections: ConnectionRepository<Kysely<Database>>,
    accounts: SyncAccounts,
    balance: SyncBalance,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.connections = connections;
    this.accounts = accounts;
    this.balance = balance;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DisconnectConnectionUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const connection = await requireConnection(this.connections, input.connectionId, executor);
      if (connection.isDisconnected()) return;

      for (const link of connection.accountLinks) {
        if (link.accountId === null) continue;
        const converted = await this.accounts.convertToManual(link.accountId, executor);
        if (!converted || converted.isCard || converted.lastBankBalanceCents === null) continue;

        const sum =
          (await this.balance.balancesOf([link.accountId], executor)).get(link.accountId) ?? 0;
        const difference = converted.lastBankBalanceCents - sum;
        if (difference === 0) continue;
        await this.balance.adjust(
          {
            accountId: link.accountId,
            amountCents: difference,
            occurredOn: this.clock.today().value,
            note: 'Saldo do banco ao desconectar',
          },
          executor,
        );
      }

      connection.disconnect(this.clock.now());
      await this.connections.save(connection, executor);
    });
  }
}

export namespace DisconnectConnectionUseCase {
  export type Input = { connectionId: string };
}

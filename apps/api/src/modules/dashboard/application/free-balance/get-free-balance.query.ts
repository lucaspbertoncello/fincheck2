import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';

import type { ConnectionReader } from '#/modules/dashboard/application/connection/connection-reader.interface.ts';
import type { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import type { ReviewReader } from '#/modules/dashboard/application/review/review-reader.interface.ts';
import { computeFreeBalance } from '#/modules/dashboard/domain/free-balance/compute-free-balance.util.ts';
import { isConnectionStale } from '#/modules/dashboard/domain/free-balance/is-connection-stale.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The Livre (BR-DSH-001, 002, 003, 010; RF-DSH-001, 002, 009, 011): the balance in the accounts +
// what still comes in - what still goes out, from today to the end of the current month, with the
// composition that opens when it is touched. It is always of today: the month selector does not
// change it (decided by the PM, Q13). The calculation is in `computeFreeBalance`; this reads the
// owners through their ports. The controller creates the missing occurrences first.
export class GetFreeBalanceQuery {
  private readonly loader: AgendaLoader;
  private readonly reviews: ReviewReader;
  private readonly connections: ConnectionReader | undefined;
  private readonly clock: Clock;

  constructor(
    loader: AgendaLoader,
    reviews: ReviewReader,
    connections: ConnectionReader | undefined,
    clock: Clock,
  ) {
    this.loader = loader;
    this.reviews = reviews;
    this.connections = connections;
    this.clock = clock;
  }

  async execute(): Promise<GetFreeBalanceQuery.Output> {
    const snapshot = await this.loader.load({ withSettled: false });
    const [byAccount, connections] = await Promise.all([
      this.reviews.countByAccount(),
      this.connections?.listConnections() ?? Promise.resolve([]),
    ]);

    // Cards and archived accounts are not in the balance: a card is debt, which the invoices carry.
    const accounts = snapshot.accounts.filter(
      (account) => !account.isArchived && account.type !== 'credit_card',
    );
    const accountsTotal = accounts.reduce(
      (total, account) => total.add(Money.fromCents(account.balanceCents ?? 0)),
      Money.zero(),
    );
    const result = computeFreeBalance({
      accountsTotal,
      entries: snapshot.entries,
      today: snapshot.today,
    });
    const withoutBalance = accounts.filter(
      (account) => account.source === 'pluggy' && account.balanceCents === null,
    );
    const now = this.clock.now();

    return {
      asOfOn: snapshot.today.value,
      daysRemaining: result.daysRemaining,
      freeBalanceCents: result.free.cents,
      isPartial: withoutBalance.length > 0,
      accountsWithoutBalance: withoutBalance.map((account) => account.id),
      perDayCents: result.perDay.cents,
      accounts: {
        totalCents: accountsTotal.cents,
        items: accounts.map((account) => ({
          accountId: account.id,
          name: account.name,
          institutionCode: account.institutionCode,
          source: account.source,
          balanceCents: account.balanceCents ?? 0,
        })),
      },
      receivable: { totalCents: result.receivableTotal.cents, items: result.receivable },
      payable: { totalCents: result.payableTotal.cents, items: result.payable },
      dataFreshness: connections
        .filter((connection) => connection.status !== 'disconnected')
        .map((connection) => ({
          connectionId: connection.connectionId,
          institutionName: connection.institutionName,
          status: connection.status,
          lastBankUpdateAt: connection.lastBankUpdateAt,
          isStale: isConnectionStale(connection.lastBankUpdateAt, now),
        })),
      review: {
        count: byAccount.reduce((total, row) => total + row.count, 0),
        byAccount: byAccount.filter((row) => row.count > 0),
      },
    };
  }
}

export namespace GetFreeBalanceQuery {
  export type Output = FreeBalance.Dto;
}

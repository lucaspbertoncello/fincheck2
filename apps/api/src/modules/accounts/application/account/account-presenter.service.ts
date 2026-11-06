import type { Account as AccountContract } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AccountConnectionReader } from '#/modules/accounts/application/account/account-connection-reader.interface.ts';
import type { ManualBalanceReader } from '#/modules/accounts/application/account/manual-balance-reader.interface.ts';
import type { Account } from '#/modules/accounts/domain/account/account.entity.ts';

// Builds the `Account.Dto` of the contract. The balance depends on the origin (accounts.md, "De
// onde vem o saldo"): a Pluggy account shows the recorded bank balance; a manual account or wallet
// shows the sum of its transactions, asked to the owner; a manual card has none. The connection of
// a Pluggy account is asked to `sync`.
export class AccountPresenter {
  private readonly manualBalances: ManualBalanceReader | undefined;
  private readonly connections: AccountConnectionReader | undefined;

  constructor(
    manualBalances: ManualBalanceReader | undefined,
    connections: AccountConnectionReader | undefined,
  ) {
    this.manualBalances = manualBalances;
    this.connections = connections;
  }

  async present(accounts: Account[], executor?: Kysely<Database>): Promise<AccountContract.Dto[]> {
    const manualIds = accounts
      .filter((account) => account.hasCalculatedBalance())
      .map((account) => account.id);
    const pluggyIds = accounts.filter((account) => account.isPluggy()).map((account) => account.id);
    const [balances, connections] = await Promise.all([
      this.manualBalances && manualIds.length > 0
        ? this.manualBalances.balancesOf(manualIds, executor)
        : new Map<string, number>(),
      this.connections && pluggyIds.length > 0
        ? this.connections.connectionsOf(pluggyIds, executor)
        : new Map<string, AccountContract.Connection>(),
    ]);

    return accounts.map((account) => ({
      id: account.id,
      type: account.type,
      source: account.source,
      name: account.name,
      institutionCode: account.institutionCode,
      institutionName: account.institutionName,
      balanceCents: account.isPluggy()
        ? (account.bankBalance?.cents ?? null)
        : account.hasCalculatedBalance()
          ? (balances.get(account.id) ?? null)
          : null,
      balanceAt: account.isPluggy() ? account.bankBalanceAt : null,
      connection: connections.get(account.id) ?? null,
      creditCard: account.creditCard
        ? {
            brand: account.creditCard.brand,
            last4: account.creditCard.last4,
            closingDay: account.creditCard.closingDay,
            dueDay: account.creditCard.dueDay,
            limitCents: account.creditCard.limit?.cents ?? null,
            themeId: account.creditCard.themeId,
          }
        : null,
      archivedAt: account.archivedAt,
      createdAt: account.createdAt,
    }));
  }

  async presentOne(account: Account, executor?: Kysely<Database>): Promise<AccountContract.Dto> {
    const [dto] = await this.present([account], executor);
    if (!dto) throw new Error('The presenter returned no account');

    return dto;
  }
}

import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// What a manual account shows: its transactions added up, until today.
function manualBalance(database: MockState.Database, accountId: string): number {
  return database.transactions
    .filter((tx) => tx.accountId === accountId && countsInAccounts(tx) && tx.occurredOn <= TODAY)
    .reduce((sum, tx) => sum + tx.amountCents, 0);
}

// The contract's Account.Dto (accounts.md, "De onde vem o saldo").
export function presentAccount(
  database: MockState.Database,
  account: MockState.AccountRecord,
): Account.Dto {
  let balanceCents: number | null;
  if (account.source === 'pluggy') {
    // A Pluggy card shows what the bank informed as used, as it came (accounts.md).
    balanceCents = account.bankBalanceCents;
  } else {
    balanceCents = account.type === 'credit_card' ? null : manualBalance(database, account.id);
  }

  const connection = database.connections.find((item) => item.id === account.connectionId);

  return {
    id: account.id,
    type: account.type,
    source: account.source,
    name: account.name,
    institutionCode: account.institutionCode,
    institutionName: account.institutionName,
    balanceCents,
    balanceAt: account.source === 'pluggy' ? account.balanceAt : null,
    connection: connection
      ? {
          connectionId: connection.id,
          status: connection.status,
          errorCode: connection.errorCode,
          lastBankUpdateAt: connection.lastBankUpdateAt,
        }
      : null,
    creditCard: account.creditCard,
    archivedAt: account.archivedAt,
    createdAt: account.createdAt,
  };
}

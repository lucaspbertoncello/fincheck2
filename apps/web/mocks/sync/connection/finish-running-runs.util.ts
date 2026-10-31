import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';

// A run in the mock lasts until the next read: then it ends well, the connection goes back to
// active and a first connection finishes bringing its history (and the balance of its account).
export function finishRunningRuns(database: MockState.Database): void {
  for (const entry of database.runs) {
    if (entry.run.status !== 'running') continue;
    const connection = database.connections.find((item) => item.id === entry.connectionId);
    const firstConnection = entry.run.trigger === 'first_connection';

    entry.run = {
      ...entry.run,
      status: 'success',
      finishedAt: NOW_ISO,
      createdCount: firstConnection ? 342 : 0,
    };
    if (!connection) continue;

    connection.status = 'active';
    connection.errorCode = null;
    connection.lastBankUpdateAt = NOW_ISO;
    connection.lastSuccessAt = NOW_ISO;
    if (firstConnection) {
      connection.history = {
        status: 'done',
        fromOn: `${Number(TODAY.slice(0, 4)) - 1}${TODAY.slice(4)}`,
        transactionCount: 342,
      };
      for (const accountId of connection.accountIds) {
        const account = database.accounts.find((item) => item.id === accountId);
        if (account && account.type !== 'credit_card' && account.bankBalanceCents === null) {
          account.bankBalanceCents = 87_420;
          account.balanceAt = NOW_ISO;
        }
      }
    }
  }
}

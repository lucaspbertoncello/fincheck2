import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

import { isConnectionStale } from '#mocks/sync/connection/is-connection-stale.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// The contract's Connection.Dto. `pendingAccountMatches` is always empty in the mock: nothing here
// produces a reconnection with more than one candidate account.
export function presentConnection(
  database: MockState.Database,
  record: MockState.ConnectionRecord,
): Connection.Dto {
  const accounts: Connection.Account[] = [];
  for (const accountId of record.accountIds) {
    const account = database.accounts.find((item) => item.id === accountId);
    if (account && account.type !== 'wallet') {
      accounts.push({ accountId: account.id, name: account.name, type: account.type });
    }
  }

  const lastRun = database.runs
    .filter((item) => item.connectionId === record.id)
    .sort((a, b) => b.run.startedAt.localeCompare(a.run.startedAt))[0]?.run;

  return {
    id: record.id,
    institutionCode: record.institutionCode,
    institutionName: record.institutionName,
    status: record.status,
    errorCode: record.errorCode,
    lastBankUpdateAt: record.lastBankUpdateAt,
    lastSuccessAt: record.lastSuccessAt,
    isStale: isConnectionStale(record.lastBankUpdateAt),
    history: record.history,
    accounts,
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
    pendingAccountMatches: [],
  };
}

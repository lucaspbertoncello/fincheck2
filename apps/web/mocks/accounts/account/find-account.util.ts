import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

export function findAccount(database: MockState.Database, id: string): MockState.AccountRecord {
  return (
    database.accounts.find((account) => account.id === id) ??
    fail(404, 'ACCOUNT_NOT_FOUND', 'A conta não existe')
  );
}

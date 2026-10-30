import { CONNECTION_STALE_AFTER_HOURS } from '@fincheck/shared/sync/connection/connection.constant.ts';

import { NOW } from '#mocks/support/dates/clock.constant.ts';

// Stale = the bank data is older than 36 hours ("dado do Bradesco de ontem").
export function isConnectionStale(lastBankUpdateAt: string | null): boolean {
  if (lastBankUpdateAt === null) return false;

  return (
    NOW.getTime() - new Date(lastBankUpdateAt).getTime() > CONNECTION_STALE_AFTER_HOURS * 3_600_000
  );
}

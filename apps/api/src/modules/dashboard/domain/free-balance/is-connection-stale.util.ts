import { CONNECTION_STALE_AFTER_HOURS } from '@fincheck/shared/sync/connection/connection.constant.ts';

// Whether the data of a connection is stale: the bank updated it more than 36 hours ago (the
// "dado do Bradesco de ontem" seal). Nothing is stale before the first update (null). Both
// arguments are instants in UTC (ISO 8601).
export function isConnectionStale(lastBankUpdateAt: string | null, now: string): boolean {
  if (lastBankUpdateAt === null) return false;

  return Date.parse(now) - Date.parse(lastBankUpdateAt) > CONNECTION_STALE_AFTER_HOURS * 3_600_000;
}

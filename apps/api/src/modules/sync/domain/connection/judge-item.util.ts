import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

const MS_PER_DAY = 86_400_000;
// No news from the bank for more than this is an error of its own (STALE_DATA, BR-SYN-004); less
// than that is only the "data of yesterday" badge, which does not stop the sync.
const STALE_DATA_AFTER_DAYS = 3;

// What a round does with the state the Pluggy reports for the item: it declared an error
// (`failed`, with the code already translated by the adapter), it is still updating the bank
// (`updating`: the data may be partial, so nothing is read now), it says nothing wrong but has not
// updated the bank for more than 3 days (`failed` with STALE_DATA), or it is fine (`import`).
export function judgeItem(
  item: {
    state: 'ok' | 'updating' | 'error';
    errorCode: 'CONSENT_REVOKED' | 'LOGIN_ERROR' | 'PROVIDER_ERROR' | null;
    lastUpdatedAt: string | null;
  },
  now: string,
): ItemVerdict {
  if (item.state === 'error') return { type: 'failed', code: item.errorCode ?? 'PROVIDER_ERROR' };
  if (item.state === 'updating') return { type: 'updating' };
  if (
    item.lastUpdatedAt !== null &&
    Date.parse(now) - Date.parse(item.lastUpdatedAt) > STALE_DATA_AFTER_DAYS * MS_PER_DAY
  ) {
    return { type: 'failed', code: 'STALE_DATA' };
  }

  return { type: 'import' };
}

export type ItemVerdict =
  { type: 'import' } | { type: 'updating' } | { type: 'failed'; code: Connection.ErrorCode };

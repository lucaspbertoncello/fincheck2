import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

// The mock has no Pluggy, so the item id plays what the Pluggy would say of it: an item whose id
// starts with one of these eight-digit groups behaves as written, any other one is a healthy bank.
// Real-looking ids (the seed, `3fa85f64-...`) never match.
export type ItemOutcome =
  | { type: 'ok' }
  // The Pluggy declared a problem: the run ends in error and the connection moves to `error`.
  | { type: 'failed'; code: Connection.ErrorCode }
  // The bank is still being read: the run ends `success` with nothing, the connection is untouched.
  | { type: 'updating' }
  // The Pluggy could not be reached (network, 5xx): the run ends `PROVIDER_ERROR`, the connection
  // is untouched.
  | { type: 'unreachable' }
  // Only when registering: the call itself is refused.
  | {
      type: 'refused';
      code: 'SYNC_ITEM_NOT_FOUND' | 'SYNC_PROVIDER_UNAVAILABLE' | 'SYNC_CREDENTIALS_INVALID';
    };

const OUTCOMES: Record<string, ItemOutcome> = {
  '00000001': { type: 'failed', code: 'LOGIN_ERROR' },
  '00000002': { type: 'failed', code: 'CONSENT_REVOKED' },
  '00000003': { type: 'failed', code: 'PROVIDER_ERROR' },
  '00000004': { type: 'failed', code: 'STALE_DATA' },
  '00000005': { type: 'updating' },
  '00000006': { type: 'unreachable' },
  '00000007': { type: 'refused', code: 'SYNC_ITEM_NOT_FOUND' },
  '00000008': { type: 'refused', code: 'SYNC_PROVIDER_UNAVAILABLE' },
  '00000009': { type: 'refused', code: 'SYNC_CREDENTIALS_INVALID' },
};

export function readItemOutcome(pluggyItemId: string): ItemOutcome {
  return OUTCOMES[pluggyItemId.slice(0, 8)] ?? { type: 'ok' };
}

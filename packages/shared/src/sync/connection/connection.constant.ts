export const CONNECTION_STATUSES = ['active', 'error', 'disconnected'] as const;
export const CONNECTION_ERROR_CODES = [
  'CONSENT_REVOKED',
  'LOGIN_ERROR',
  'STALE_DATA',
  'PROVIDER_ERROR',
] as const;
export const HISTORY_STATUSES = ['pending', 'running', 'done'] as const;

// A connection whose last bank update is older than this shows the "data from yesterday" badge.
export const CONNECTION_STALE_AFTER_HOURS = 36;

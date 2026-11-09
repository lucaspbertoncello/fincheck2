import { createHash } from 'node:crypto';

import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';

// What tells one pair of keys from another in memory, so the secret itself is never kept as a key.
export function hashPluggyCredentials(credentials: BankDataProvider.Credentials): string {
  return createHash('sha256')
    .update(JSON.stringify([credentials.clientId, credentials.clientSecret]))
    .digest('hex');
}

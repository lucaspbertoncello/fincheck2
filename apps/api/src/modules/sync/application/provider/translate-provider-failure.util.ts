import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import { SyncItemNotFoundError } from '#/modules/sync/domain/connection/sync-item-not-found.error.ts';
import { SyncCredentialsInvalidError } from '#/modules/sync/domain/settings/sync-credentials-invalid.error.ts';
import { SyncProviderUnavailableError } from '#/modules/sync/domain/settings/sync-provider-unavailable.error.ts';

// What the request of Lucas hears when the provider failed (the port throws only `BankProviderError`):
// the domain error of the contract of that kind. Anything that is not a provider failure goes
// through untouched, for whoever called to rethrow it.
export function translateProviderFailure(error: unknown): unknown {
  if (!(error instanceof BankProviderError)) return error;
  if (error.kind === 'credentials_invalid') return new SyncCredentialsInvalidError();
  if (error.kind === 'item_not_found') return new SyncItemNotFoundError();

  return new SyncProviderUnavailableError();
}

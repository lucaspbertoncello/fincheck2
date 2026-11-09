import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';

// What the call was doing, because the same status means another thing in each: a 4xx on the
// authentication is the keys refused, a 404 on the item is a connection the provider does not have.
export type PluggyErrorContext = 'authentication' | 'item' | 'other';

// A failure of the HTTP call (a status, or `null` when there was no answer: network, timeout) as
// the `BankProviderError` of the port. It never reads the body: it can echo a key.
export function translatePluggyError(
  status: number | null,
  context: PluggyErrorContext,
): BankProviderError {
  if (status === null || status === 429 || status >= 500)
    return new BankProviderError('unavailable');
  if (context === 'authentication' && status >= 400) {
    return new BankProviderError('credentials_invalid');
  }
  if (context === 'item' && status === 404) return new BankProviderError('item_not_found');

  return new BankProviderError('unavailable');
}

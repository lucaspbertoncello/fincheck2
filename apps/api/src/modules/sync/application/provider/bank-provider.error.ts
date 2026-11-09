// What the provider adapter throws when it cannot do what the core asked. Never carries the raw
// message of the provider (it can echo a key): only the kind. The use cases turn it into a domain
// error (`SYNC_CREDENTIALS_INVALID`, `SYNC_ITEM_NOT_FOUND`, `SYNC_PROVIDER_UNAVAILABLE`) or into the
// `errorCode` of a run.
export class BankProviderError extends Error {
  readonly kind: BankProviderError.Kind;

  constructor(kind: BankProviderError.Kind) {
    super(`The bank data provider failed: ${kind}`);
    this.name = 'BankProviderError';
    this.kind = kind;
  }
}

export namespace BankProviderError {
  // `credentials_invalid`: the provider refused the keys (a 4xx on the authentication).
  // `item_not_found`: the provider has no such connection (404 on the item).
  // `unavailable`: network, 5xx, 429, a body that is not what was documented.
  export type Kind = 'credentials_invalid' | 'item_not_found' | 'unavailable';
}

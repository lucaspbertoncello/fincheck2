import { DomainError } from '#/shared/errors/domain.error.ts';

// It was not possible to talk to the Pluggy (network, 5xx, 429): try again.
export class SyncProviderUnavailableError extends DomainError {
  readonly code = 'SYNC_PROVIDER_UNAVAILABLE';

  constructor() {
    super('Não foi possível falar com o Pluggy. Tente de novo.');
  }
}

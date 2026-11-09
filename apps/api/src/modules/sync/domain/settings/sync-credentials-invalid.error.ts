import { DomainError } from '#/shared/errors/domain.error.ts';

// The Pluggy refused the keys (a 4xx on the authentication).
export class SyncCredentialsInvalidError extends DomainError {
  readonly code = 'SYNC_CREDENTIALS_INVALID';

  constructor() {
    super('As chaves do Pluggy foram recusadas.');
  }
}

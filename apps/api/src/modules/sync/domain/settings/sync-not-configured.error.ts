import { DomainError } from '#/shared/errors/domain.error.ts';

// There are no keys saved (or the secret does not decrypt on this PC).
export class SyncNotConfiguredError extends DomainError {
  readonly code = 'SYNC_NOT_CONFIGURED';

  constructor() {
    super('Configure as chaves do Pluggy primeiro.');
  }
}

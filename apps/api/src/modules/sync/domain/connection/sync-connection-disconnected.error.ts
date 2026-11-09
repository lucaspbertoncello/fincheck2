import { DomainError } from '#/shared/errors/domain.error.ts';

// The connection was disconnected: no round runs on it.
export class SyncConnectionDisconnectedError extends DomainError {
  readonly code = 'SYNC_CONNECTION_DISCONNECTED';

  constructor() {
    super('A conexão foi desconectada.');
  }
}

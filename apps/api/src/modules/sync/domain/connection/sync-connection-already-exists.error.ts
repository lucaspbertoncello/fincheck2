import { ConflictError } from '#/shared/errors/conflict.error.ts';

// An active connection or one in error already has this item; `details` says which and its state.
export class SyncConnectionAlreadyExistsError extends ConflictError {
  readonly code = 'SYNC_CONNECTION_ALREADY_EXISTS';

  constructor(connectionId: string, status: 'active' | 'error') {
    super('Esse banco já está conectado.', { connectionId, status });
  }
}

import { ConflictError } from '#/shared/errors/conflict.error.ts';

// A round is already running on this connection.
export class SyncRunInProgressError extends ConflictError {
  readonly code = 'SYNC_RUN_IN_PROGRESS';

  constructor() {
    super('Já há uma busca em andamento nesta conexão.');
  }
}

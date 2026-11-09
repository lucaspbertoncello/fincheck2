import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no connection.
export class SyncConnectionNotFoundError extends NotFoundError {
  readonly code = 'SYNC_CONNECTION_NOT_FOUND';

  constructor() {
    super('A conexão não existe.');
  }
}

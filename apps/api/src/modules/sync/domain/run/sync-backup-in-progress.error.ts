import { ConflictError } from '#/shared/errors/conflict.error.ts';

// A request that would open a round (or write a connection) arrived while the backup restores the
// database. Same code and status as the backup's own error (`BACKUP_IN_PROGRESS`, 409), declared
// here because a context does not import the domain of another.
export class SyncBackupInProgressError extends ConflictError {
  readonly code = 'BACKUP_IN_PROGRESS';

  constructor() {
    super('Há uma restauração de backup em andamento. Tente de novo em instantes.');
  }
}

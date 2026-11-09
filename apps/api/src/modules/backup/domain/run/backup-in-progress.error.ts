import { ConflictError } from '#/shared/errors/conflict.error.ts';

// A backup or a restore is already running; only one at a time.
export class BackupInProgressError extends ConflictError {
  readonly code = 'BACKUP_IN_PROGRESS';

  constructor() {
    super('Já há um backup ou uma restauração em andamento.');
  }
}

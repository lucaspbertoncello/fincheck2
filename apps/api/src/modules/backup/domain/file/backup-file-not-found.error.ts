import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The file to restore is not in the folder (or there is no folder).
export class BackupFileNotFoundError extends NotFoundError {
  readonly code = 'BACKUP_FILE_NOT_FOUND';

  constructor() {
    super('Esse backup não está na pasta.');
  }
}

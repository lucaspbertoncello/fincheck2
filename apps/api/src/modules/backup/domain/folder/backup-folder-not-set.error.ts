import { DomainError } from '#/shared/errors/domain.error.ts';

// A backup was asked before a folder was chosen.
export class BackupFolderNotSetError extends DomainError {
  readonly code = 'BACKUP_FOLDER_NOT_SET';

  constructor() {
    super('Escolha a pasta de backup antes de fazer um backup.');
  }
}

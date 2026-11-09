import { DomainError } from '#/shared/errors/domain.error.ts';

export type BackupFolderInvalidReason = 'not_found' | 'not_a_folder' | 'not_writable';

// The folder does not exist, is not a folder, or the API cannot write in it.
export class BackupFolderInvalidError extends DomainError {
  readonly code = 'BACKUP_FOLDER_INVALID';

  constructor(reason: BackupFolderInvalidReason) {
    super(
      reason === 'not_found'
        ? 'A pasta de backup não existe ou não abre.'
        : reason === 'not_a_folder'
          ? 'O caminho informado não é uma pasta.'
          : 'Não consegui gravar na pasta de backup.',
      { reason },
    );
  }
}

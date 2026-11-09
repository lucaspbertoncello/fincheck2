import { DomainError } from '#/shared/errors/domain.error.ts';

export type BackupFileInvalidReason = 'corrupt' | 'not_fincheck' | 'newer_version';

// The file cannot be restored: damaged, not a Fincheck database, or from a newer version of the
// app. Nothing is swapped.
export class BackupFileInvalidError extends DomainError {
  readonly code = 'BACKUP_FILE_INVALID';

  constructor(reason: BackupFileInvalidReason) {
    super(
      reason === 'corrupt'
        ? 'O arquivo de backup está danificado.'
        : reason === 'not_fincheck'
          ? 'Esse arquivo não é um banco do Fincheck.'
          : 'Esse backup vem de uma versão mais nova do Fincheck.',
      { reason },
    );
  }
}

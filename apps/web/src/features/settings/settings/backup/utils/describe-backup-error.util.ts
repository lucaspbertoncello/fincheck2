import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';

const REASON: Record<Exclude<BackupStatus.ErrorCode, 'RESTORE_FAILED'>, string> = {
  BACKUP_FOLDER_INVALID: 'a pasta não está acessível',
  BACKUP_DISK_FULL: 'o disco está cheio',
  BACKUP_FAILED: 'deu erro ao copiar o banco',
};

/** "O último backup falhou: o disco está cheio." The failed restore says that nothing was restored. */
export function describeBackupError(code: BackupStatus.ErrorCode): string {
  if (code === 'RESTORE_FAILED') {
    return 'A restauração falhou e nada foi restaurado: o banco continua o de antes.';
  }
  return `O último backup falhou: ${REASON[code]}.`;
}

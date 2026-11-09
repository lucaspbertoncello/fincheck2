import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';

const REASON: Record<BackupStatus.ErrorCode, string> = {
  BACKUP_FOLDER_INVALID: 'a pasta não está acessível',
  BACKUP_DISK_FULL: 'o disco está cheio',
  BACKUP_FAILED: 'deu erro ao copiar o banco',
  RESTORE_FAILED: 'a restauração não foi concluída e o banco anterior foi mantido',
};

/** "O último backup falhou: o disco está cheio." */
export function describeBackupError(code: BackupStatus.ErrorCode): string {
  if (code === 'RESTORE_FAILED') return `A última restauração falhou: ${REASON[code]}.`;
  return `O último backup falhou: ${REASON[code]}.`;
}

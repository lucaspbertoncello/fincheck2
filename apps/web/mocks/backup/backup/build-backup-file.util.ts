import type { BackupFile } from '@fincheck/shared/backup/backup-file/backup-file.type.ts';

import { NOW } from '#mocks/support/dates/clock.constant.ts';

// A backup file entry named after São Paulo's clock: `fincheck-AAAA-MM-DD-HHmmss.db`.
export function buildBackupFile(at: Date = NOW, sizeBytes = 2_450_000): BackupFile.Dto {
  const local = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(at);
  const [date, time] = local.split(' ');

  return {
    fileName: `fincheck-${date}-${(time ?? '000000').replaceAll(':', '')}.db`,
    createdAt: at.toISOString(),
    sizeBytes,
  };
}

import { describe, expect, it } from 'vitest';

import { describeBackupError } from '#/features/settings/settings/backup/utils/describe-backup-error.util.ts';

describe('describeBackupError', () => {
  it('says why a backup failed', () => {
    expect(describeBackupError('BACKUP_DISK_FULL')).toBe(
      'O último backup falhou: o disco está cheio.',
    );
    expect(describeBackupError('BACKUP_FOLDER_INVALID')).toBe(
      'O último backup falhou: a pasta não está acessível.',
    );
  });

  it('says that a restore that failed after the 202 restored nothing', () => {
    expect(describeBackupError('RESTORE_FAILED')).toBe(
      'A restauração falhou e nada foi restaurado: o banco continua o de antes.',
    );
  });
});

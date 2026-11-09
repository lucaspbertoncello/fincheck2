import { describe, expect, it } from 'vitest';

import { BackupFolderInvalidError } from '#/modules/backup/domain/folder/backup-folder-invalid.error.ts';
import { classifyBackupFailure } from '#/modules/backup/domain/run/classify-backup-failure.util.ts';

const withCode = (code: string) => Object.assign(new Error('boom'), { code });

describe('classifyBackupFailure', () => {
  it.each(['ENOSPC', 'SQLITE_FULL'])('says the disk is full for %s', (code) => {
    expect(classifyBackupFailure(withCode(code))).toBe('BACKUP_DISK_FULL');
  });

  it.each(['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'EROFS', 'SQLITE_CANTOPEN'])(
    'says the folder is invalid for %s',
    (code) => {
      expect(classifyBackupFailure(withCode(code))).toBe('BACKUP_FOLDER_INVALID');
    },
  );

  it('says the folder is invalid for the error of the domain', () => {
    expect(classifyBackupFailure(new BackupFolderInvalidError('not_found'))).toBe(
      'BACKUP_FOLDER_INVALID',
    );
  });

  it('is a plain failure for anything else', () => {
    expect(classifyBackupFailure(new Error('boom'))).toBe('BACKUP_FAILED');
    expect(classifyBackupFailure(withCode('SQLITE_BUSY'))).toBe('BACKUP_FAILED');
    expect(classifyBackupFailure('text')).toBe('BACKUP_FAILED');
    expect(classifyBackupFailure(null)).toBe('BACKUP_FAILED');
  });
});

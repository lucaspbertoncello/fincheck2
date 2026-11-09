import type { BackupStatus } from '@fincheck/shared/backup/backup-status/backup-status.type.ts';

import { BackupFolderInvalidError } from '#/modules/backup/domain/folder/backup-folder-invalid.error.ts';

const FOLDER_CODES = new Set([
  'ENOENT',
  'ENOTDIR',
  'EACCES',
  'EPERM',
  'EROFS',
  'ENODEV',
  'ENXIO',
  'EISDIR',
  'ENAMETOOLONG',
  'SQLITE_CANTOPEN',
  'SQLITE_READONLY',
  'SQLITE_PERM',
]);

// The code of `lastError` for a failure of a backup: the disk is full, the folder is gone or cannot
// be written, or anything else. It reads the `code` that the errors of Node and SQLite carry.
export function classifyBackupFailure(error: unknown): BackupStatus.ErrorCode {
  if (error instanceof BackupFolderInvalidError) return 'BACKUP_FOLDER_INVALID';
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'ENOSPC' || code === 'SQLITE_FULL') return 'BACKUP_DISK_FULL';
  if (FOLDER_CODES.has(code)) return 'BACKUP_FOLDER_INVALID';

  return 'BACKUP_FAILED';
}

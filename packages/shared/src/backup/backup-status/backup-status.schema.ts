import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { backupFileNameSchema } from '../backup-file/backup-file.schema.ts';

// These codes only appear inside `lastError`; they are not HTTP answers.
export const backupErrorCodeSchema = z.enum([
  'BACKUP_FOLDER_INVALID',
  'BACKUP_DISK_FULL',
  'BACKUP_FAILED',
]);

export const backupLastBackupDtoSchema = z.object({
  fileName: backupFileNameSchema,
  createdAt: instantSchema,
  sizeBytes: z.int().nonnegative(),
});

export const backupLastErrorDtoSchema = z.object({
  at: instantSchema,
  code: backupErrorCodeSchema,
});

export const backupStatusDtoSchema = z.object({
  folderPath: z.string().nullable(),
  lastBackup: backupLastBackupDtoSchema.nullable(),
  keepCount: z.int().positive(),
  nextScheduledAt: instantSchema.nullable(),
  running: z.boolean(),
  lastError: backupLastErrorDtoSchema.nullable(),
});

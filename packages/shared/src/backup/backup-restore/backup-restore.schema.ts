import { z } from 'zod';

import { backupFileNameSchema } from '../backup-file/backup-file.schema.ts';

export const restoreBackupRequestSchema = z.object({ fileName: backupFileNameSchema });

export const restoreBackupResponseSchema = z.object({ safetyCopyFileName: backupFileNameSchema });

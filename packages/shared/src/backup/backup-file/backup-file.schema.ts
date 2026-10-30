import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { BACKUP_FILE_NAME_PATTERN } from './backup-file.constant.ts';

export const backupFileNameSchema = z.string().regex(BACKUP_FILE_NAME_PATTERN);

export const backupFileDtoSchema = z.object({
  fileName: backupFileNameSchema,
  createdAt: instantSchema,
  sizeBytes: z.int().nonnegative(),
});

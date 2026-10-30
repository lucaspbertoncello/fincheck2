import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { backupFileNameSchema } from '../backup-file/backup-file.schema.ts';

export const backupRunDtoSchema = z.object({
  fileName: backupFileNameSchema,
  startedAt: instantSchema,
});

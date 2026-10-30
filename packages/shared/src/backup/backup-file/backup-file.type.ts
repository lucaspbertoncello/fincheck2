import type { z } from 'zod';

import type { backupFileDtoSchema, backupFileNameSchema } from './backup-file.schema.ts';

export namespace BackupFile {
  export type Dto = z.infer<typeof backupFileDtoSchema>;
  export type Name = z.infer<typeof backupFileNameSchema>;
}

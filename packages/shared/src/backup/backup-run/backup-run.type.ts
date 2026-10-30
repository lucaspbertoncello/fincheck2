import type { z } from 'zod';

import type { backupRunDtoSchema } from './backup-run.schema.ts';

export namespace BackupRun {
  export type Dto = z.infer<typeof backupRunDtoSchema>;
}

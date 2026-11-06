import type { z } from 'zod';

import type { backupStatsDtoSchema } from './backup-stats.schema.ts';

export namespace BackupStats {
  export type Dto = z.infer<typeof backupStatsDtoSchema>;
}

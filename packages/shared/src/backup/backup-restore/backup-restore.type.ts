import type { z } from 'zod';

import type {
  restoreBackupRequestSchema,
  restoreBackupResponseSchema,
} from './backup-restore.schema.ts';

export namespace BackupRestore {
  export type Request = z.infer<typeof restoreBackupRequestSchema>;
  export type Response = z.infer<typeof restoreBackupResponseSchema>;
}

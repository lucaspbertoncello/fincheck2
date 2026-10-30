import type { z } from 'zod';

import type {
  backupErrorCodeSchema,
  backupLastBackupDtoSchema,
  backupLastErrorDtoSchema,
  backupStatusDtoSchema,
} from './backup-status.schema.ts';

export namespace BackupStatus {
  export type Dto = z.infer<typeof backupStatusDtoSchema>;
  export type LastBackup = z.infer<typeof backupLastBackupDtoSchema>;
  export type LastError = z.infer<typeof backupLastErrorDtoSchema>;
  export type ErrorCode = z.infer<typeof backupErrorCodeSchema>;
}

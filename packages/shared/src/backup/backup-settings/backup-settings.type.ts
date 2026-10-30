import type { z } from 'zod';

import type { updateBackupSettingsRequestSchema } from './backup-settings.schema.ts';

export namespace BackupSettings {
  export type UpdateRequest = z.infer<typeof updateBackupSettingsRequestSchema>;
}

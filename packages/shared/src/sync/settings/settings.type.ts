import type { z } from 'zod';

import type { saveSyncSettingsRequestSchema, syncSettingsDtoSchema } from './settings.schema.ts';

export namespace SyncSettings {
  export type Dto = z.infer<typeof syncSettingsDtoSchema>;
  export type SaveRequest = z.infer<typeof saveSyncSettingsRequestSchema>;
}

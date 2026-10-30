import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';

// The secret never appears in any answer.
export const syncSettingsDtoSchema = z.object({
  configured: z.boolean(),
  clientId: z.string().nullable(),
  updatedAt: instantSchema.nullable(),
});

export const saveSyncSettingsRequestSchema = z.object({
  clientId: z.string().trim().min(1).max(100),
  clientSecret: z.string().trim().min(1).max(200),
});

import { z } from 'zod';

export const healthStatusSchema = z.enum(['ok', 'degraded']);

export const healthDtoSchema = z.object({
  status: healthStatusSchema,
  database: z.enum(['ok', 'unavailable']),
});

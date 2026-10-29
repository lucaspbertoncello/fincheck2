import { z } from 'zod';

// The body of every error answer from the API. The front decides by `code`, never by `message`.
export const apiErrorSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

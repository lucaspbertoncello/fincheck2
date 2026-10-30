import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';

export const connectTokenDtoSchema = z.object({
  connectToken: z.string(),
  expiresAt: instantSchema,
});

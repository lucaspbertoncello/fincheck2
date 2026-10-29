import type { z } from 'zod';

import type { apiErrorSchema } from './api-error.schema.ts';

export namespace ApiError {
  export type Dto = z.infer<typeof apiErrorSchema>;
}

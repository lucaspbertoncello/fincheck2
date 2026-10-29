import type { z } from 'zod';

import type { healthDtoSchema, healthStatusSchema } from './health.schema.ts';

export namespace Health {
  export type Dto = z.infer<typeof healthDtoSchema>;
  export type Status = z.infer<typeof healthStatusSchema>;
}

import type { z } from 'zod';

import type { monthQuerySchema } from './date.schema.ts';

export namespace DateQuery {
  export type MonthQuery = z.infer<typeof monthQuerySchema>;
}

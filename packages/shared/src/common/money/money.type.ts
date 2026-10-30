import type { z } from 'zod';

import type { centsSchema } from './money.schema.ts';

export namespace Money {
  export type Cents = z.infer<typeof centsSchema>;
}

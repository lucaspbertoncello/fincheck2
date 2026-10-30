import type { z } from 'zod';

import type { freeBalanceDtoSchema } from './free-balance.schema.ts';

export namespace FreeBalance {
  export type Dto = z.infer<typeof freeBalanceDtoSchema>;
}

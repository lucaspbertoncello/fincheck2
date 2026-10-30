import type { z } from 'zod';

import type { institutionCodeSchema } from './institution.schema.ts';

export namespace Institution {
  export type Code = z.infer<typeof institutionCodeSchema>;
}

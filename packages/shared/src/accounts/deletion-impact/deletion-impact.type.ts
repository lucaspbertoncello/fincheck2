import type { z } from 'zod';

import type { deletionImpactDtoSchema } from './deletion-impact.schema.ts';

export namespace DeletionImpact {
  export type Dto = z.infer<typeof deletionImpactDtoSchema>;
}

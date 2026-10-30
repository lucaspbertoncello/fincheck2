import type { z } from 'zod';

import type { spendingCurveDtoSchema } from './spending-curve.schema.ts';

export namespace SpendingCurve {
  export type Dto = z.infer<typeof spendingCurveDtoSchema>;
}

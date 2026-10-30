import type { z } from 'zod';

import type {
  adjustBalanceRequestSchema,
  adjustBalanceResponseSchema,
} from './balance-adjustment.schema.ts';

export namespace BalanceAdjustment {
  export type Request = z.infer<typeof adjustBalanceRequestSchema>;
  export type Response = z.infer<typeof adjustBalanceResponseSchema>;
}

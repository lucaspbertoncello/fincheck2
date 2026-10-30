import type { z } from 'zod';

import type {
  balanceHistoryDtoSchema,
  balanceHistoryQuerySchema,
} from './balance-history.schema.ts';

export namespace BalanceHistory {
  export type Query = z.infer<typeof balanceHistoryQuerySchema>;
  export type Dto = z.infer<typeof balanceHistoryDtoSchema>;
}

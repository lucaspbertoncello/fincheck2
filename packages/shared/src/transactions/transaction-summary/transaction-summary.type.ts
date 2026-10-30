import type { z } from 'zod';

import type {
  transactionSummaryDtoSchema,
  transactionSummaryQuerySchema,
} from './transaction-summary.schema.ts';

export namespace TransactionSummary {
  export type Query = z.infer<typeof transactionSummaryQuerySchema>;
  export type Dto = z.infer<typeof transactionSummaryDtoSchema>;
}

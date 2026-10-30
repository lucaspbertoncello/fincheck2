import type { z } from 'zod';

import type {
  bulkTransactionsRequestSchema,
  bulkTransactionsResultSchema,
  previousStateSchema,
  restoreBulkRequestSchema,
  restoreBulkResultSchema,
} from './transaction-bulk.schema.ts';

export namespace TransactionBulk {
  export type Request = z.infer<typeof bulkTransactionsRequestSchema>;
  export type Action = Request['action'];
  export type Result = z.infer<typeof bulkTransactionsResultSchema>;
  export type PreviousState = z.infer<typeof previousStateSchema>;
  export type RestoreRequest = z.infer<typeof restoreBulkRequestSchema>;
  export type RestoreResult = z.infer<typeof restoreBulkResultSchema>;
}

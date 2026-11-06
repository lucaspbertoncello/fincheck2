import { z } from 'zod';

import { businessDateSchema } from '../../common/date/date.schema.ts';

export const backupStatsDtoSchema = z.object({
  dbSizeBytes: z.int().nonnegative(),
  transactionCount: z.int().nonnegative(),
  // Accounts and cards that are not archived.
  accountCount: z.int().nonnegative(),
  // The date of the oldest transaction; null while the database has none.
  firstTransactionOn: businessDateSchema.nullable(),
});

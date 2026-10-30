import { z } from 'zod';

import { monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { positiveCentsSchema } from '../../common/money/money.schema.ts';
import { transactionDtoSchema } from '../transaction/transaction.schema.ts';

export const reviewQueueQuerySchema = z.object({
  month: monthSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const reviewQueueItemDtoSchema = z.object({
  transaction: transactionDtoSchema,
  categorySuggestions: z
    .array(z.object({ categoryId: idSchema, reason: z.enum(['history', 'rule']) }))
    .max(3),
  recurrenceCandidates: z.array(
    z.object({
      occurrenceId: idSchema,
      recurrenceId: idSchema,
      recurrenceName: z.string(),
      month: monthSchema,
      expectedAmountCents: positiveCentsSchema,
      remainingCents: positiveCentsSchema,
    }),
  ),
  rulePattern: z.string(),
});

export const reviewQueueDtoSchema = z.object({
  total: z.int().nonnegative(),
  items: z.array(reviewQueueItemDtoSchema),
});

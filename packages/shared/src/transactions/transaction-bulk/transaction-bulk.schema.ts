import { z } from 'zod';

import { instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { transactionCategorySourceSchema } from '../transaction/transaction.schema.ts';
import { BULK_LIMITS } from './transaction-bulk.constant.ts';

// The state of a transaction before a bulk action: what "Desfazer" sends back.
export const previousStateSchema = z.object({
  transactionId: idSchema,
  categoryId: idSchema.nullable(),
  categorySource: transactionCategorySourceSchema.nullable(),
  categoryRuleId: idSchema.nullable(),
  tagIds: z.array(idSchema),
  ignoredAt: instantSchema.nullable(),
  // Who had set the nature; the undo of a category that is a transfer gives it back. Older
  // responses carry none: the system.
  natureSetBy: z.enum(['system', 'user']).optional(),
});

const bulkActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('categorize'), categoryId: idSchema }),
  z.object({ type: z.literal('addTag'), tagId: idSchema }),
  z.object({ type: z.literal('ignore') }),
]);

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

export const bulkTransactionsRequestSchema = z.object({
  transactionIds: z
    .array(idSchema)
    .min(1)
    .max(BULK_LIMITS.max)
    .refine(uniqueIds, { message: 'Ids must not repeat' }),
  action: bulkActionSchema,
});

export const bulkTransactionsResultSchema = z.object({
  updatedCount: z.int().nonnegative(),
  skipped: z.array(
    z.object({
      transactionId: idSchema,
      reason: z.enum([
        'split',
        'outside_account',
        'category_kind_mismatch',
        'tag_category_mismatch',
        'not_found',
        'no_change',
      ]),
    }),
  ),
  previous: z.array(previousStateSchema),
});

export const restoreBulkRequestSchema = z.object({
  items: z.array(previousStateSchema).min(1).max(BULK_LIMITS.max),
});

export const restoreBulkResultSchema = z.object({ restoredCount: z.int().nonnegative() });

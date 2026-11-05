import { z } from 'zod';

import { monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';
import { categoryKindSchema } from '../../categories/category/category.schema.ts';

// `until` is the last of the 12 months; it defaults to the current month.
export const categoryTrendQuerySchema = z.object({ until: monthSchema.optional() });

// The 12 months up to `until`, oldest first; a month with no movement comes with 0. Amounts have
// no sign: an expense category counts what was spent, an income category what was received.
export const categoryTrendDtoSchema = z.object({
  categoryId: idSchema,
  kind: categoryKindSchema,
  months: z
    .array(
      z.object({
        month: monthSchema,
        totalCents: centsSchema,
        transactionCount: z.int().nonnegative(),
      }),
    )
    .length(12),
});

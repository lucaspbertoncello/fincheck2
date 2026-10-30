import { z } from 'zod';

import { monthSchema } from '../../common/date/date.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';

export const transactionSummaryQuerySchema = z.object({ month: monthSchema });

export const transactionSummaryDtoSchema = z.object({
  month: monthSchema,
  expensesCents: centsSchema,
  incomesCents: centsSchema,
  outsideCents: centsSchema,
  reviewCount: z.int().nonnegative(),
  reviewTotalCents: centsSchema,
});

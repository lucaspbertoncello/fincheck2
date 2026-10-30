import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, nonNegativeCentsSchema } from '../../common/money/money.schema.ts';
import { occurrenceStatusSchema } from '../../recurrences/occurrence/occurrence.schema.ts';

const pctSchema = z.number().nullable();

export const categoryBreakdownExpenseItemSchema = z.object({
  categoryId: idSchema.nullable(),
  spentCents: centsSchema,
  previousSpentCents: centsSchema,
  changeCents: centsSchema,
  changePct: pctSchema,
  sharePct: pctSchema,
  transactionCount: z.int().nonnegative(),
  latest: z
    .array(
      z.object({
        transactionId: idSchema,
        description: z.string(),
        occurredOn: businessDateSchema,
        amountCents: centsSchema,
      }),
    )
    .max(3),
});

export const categoryBreakdownIncomeItemSchema = z.object({
  categoryId: idSchema.nullable(),
  receivedCents: centsSchema,
  expectedCents: centsSchema,
  pending: z.array(
    z.object({
      occurrenceId: idSchema,
      recurrenceName: z.string(),
      remainingCents: nonNegativeCentsSchema,
      expectedOn: businessDateSchema.nullable(),
      status: occurrenceStatusSchema,
    }),
  ),
});

export const categoryBreakdownDtoSchema = z.object({
  month: monthSchema,
  comparedUntilOn: businessDateSchema,
  expenses: z.object({
    totalCents: centsSchema,
    previousTotalCents: centsSchema,
    items: z.array(categoryBreakdownExpenseItemSchema),
    topGrowth: z
      .object({ categoryId: idSchema.nullable(), changePct: pctSchema, changeCents: centsSchema })
      .nullable(),
  }),
  review: z.object({ count: z.int().nonnegative(), totalCents: centsSchema }),
  incomes: z.object({
    receivedCents: centsSchema,
    expectedCents: centsSchema,
    items: z.array(categoryBreakdownIncomeItemSchema),
  }),
});

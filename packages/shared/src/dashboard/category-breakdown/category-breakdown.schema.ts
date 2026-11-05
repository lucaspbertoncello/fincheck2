import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, nonNegativeCentsSchema } from '../../common/money/money.schema.ts';
import { occurrenceStatusSchema } from '../../recurrences/occurrence/occurrence.schema.ts';

const pctSchema = z.number().nullable();

// `month`, or `from` and `to` (both ends included), or nothing (all the history). Without a month
// the comparison is against the period of the same size right before; with nothing there is none.
export const categoryBreakdownQuerySchema = z
  .object({
    month: monthSchema.optional(),
    from: businessDateSchema.optional(),
    to: businessDateSchema.optional(),
  })
  .superRefine((value, context) => {
    const hasRange = value.from !== undefined || value.to !== undefined;
    if (value.month && hasRange) {
      context.addIssue({
        code: 'custom',
        path: ['month'],
        message: 'month does not combine with from or to',
      });
    }
    if ((value.from === undefined) !== (value.to === undefined)) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'from and to come together' });
    }
    if (value.from !== undefined && value.to !== undefined && value.from > value.to) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'from is after to' });
    }
  });

export const categoryBreakdownExpenseItemSchema = z.object({
  categoryId: idSchema.nullable(),
  spentCents: centsSchema,
  // Null over all the history, where there is no period before to compare with.
  previousSpentCents: centsSchema.nullable(),
  changeCents: centsSchema.nullable(),
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
  // Null when the read is a free period or all the history.
  month: monthSchema.nullable(),
  // Where the comparison stops; null over all the history.
  comparedUntilOn: businessDateSchema.nullable(),
  expenses: z.object({
    totalCents: centsSchema,
    previousTotalCents: centsSchema.nullable(),
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

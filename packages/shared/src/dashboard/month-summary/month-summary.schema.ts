import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';

export const monthSummaryAlertSchema = z.object({
  type: z.enum(['connection_error', 'stale_data', 'late_occurrence']),
  connectionId: idSchema.nullable(),
  institutionName: z.string().nullable(),
  occurrenceId: idSchema.nullable(),
  recurrenceName: z.string().nullable(),
  daysLate: z.int().nonnegative().nullable(),
});

const pctSchema = z.number().nullable();

export const monthSummaryDtoSchema = z.object({
  month: monthSchema,
  isCurrentMonth: z.boolean(),
  asOfOn: businessDateSchema,
  remaining: z
    .object({
      daysRemaining: z.int().min(1),
      incomingCents: centsSchema,
      outgoingCents: centsSchema,
    })
    .nullable(),
  income: z.object({
    receivedCents: centsSchema,
    expectedCents: centsSchema,
    receivedPct: pctSchema,
  }),
  expenses: z.object({
    spentCents: centsSchema,
    previousSpentCents: centsSchema,
    changeCents: centsSchema,
    changePct: pctSchema,
    comparedFromOn: businessDateSchema,
    comparedUntilOn: businessDateSchema,
    previousComparedUntilOn: businessDateSchema,
  }),
  result: z.object({ cents: centsSchema, previousCents: centsSchema }),
  alerts: z.array(monthSummaryAlertSchema),
});

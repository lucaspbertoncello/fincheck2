import { z } from 'zod';

import { monthSchema } from '../../common/date/date.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';

// Cumulative spending per day: `currentCents` is null after today, `previousCents` is null on the
// days the previous month does not have.
export const spendingCurveDtoSchema = z.object({
  month: monthSchema,
  previousMonth: monthSchema,
  days: z.array(
    z.object({
      day: z.int().min(1).max(31),
      currentCents: centsSchema.nullable(),
      previousCents: centsSchema.nullable(),
    }),
  ),
});

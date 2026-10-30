import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';

export const balanceHistoryQuerySchema = z.object({ month: monthSchema });

export const balanceHistoryDtoSchema = z.object({
  accountId: idSchema,
  month: monthSchema,
  points: z.array(z.object({ date: businessDateSchema, balanceCents: centsSchema })),
});

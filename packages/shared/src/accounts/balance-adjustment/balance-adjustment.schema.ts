import { z } from 'zod';

import { businessDateSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema } from '../../common/money/money.schema.ts';
import { accountDtoSchema } from '../account/account.schema.ts';

export const adjustBalanceRequestSchema = z.object({
  targetBalanceCents: centsSchema,
  occurredOn: businessDateSchema.optional(),
  note: z.string().max(200).optional(),
});

export const adjustBalanceResponseSchema = z.object({
  account: accountDtoSchema,
  adjustment: z.object({
    transactionId: idSchema,
    amountCents: centsSchema.refine((value) => value !== 0, { message: 'Never zero' }),
  }),
});

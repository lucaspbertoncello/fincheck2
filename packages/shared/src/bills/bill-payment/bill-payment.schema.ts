import { z } from 'zod';

import { businessDateSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { positiveCentsSchema } from '../../common/money/money.schema.ts';

export const billPaymentDtoSchema = z.object({
  id: idSchema,
  amountCents: positiveCentsSchema,
  paidOn: businessDateSchema,
  transactionId: idSchema.nullable(),
  description: z.string().nullable(),
});

export const createBillPaymentRequestSchema = z
  .object({
    transactionId: idSchema.optional(),
    amountCents: positiveCentsSchema.optional(),
    paidOn: businessDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.transactionId) return;
    if (value.amountCents === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['amountCents'],
        message: 'Required without a transaction',
      });
    }
    if (value.paidOn === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['paidOn'],
        message: 'Required without a transaction',
      });
    }
  });

export const billPaymentParamsSchema = z.object({ id: idSchema, paymentId: idSchema });

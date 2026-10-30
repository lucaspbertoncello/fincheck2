import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { positiveCentsSchema } from '../../common/money/money.schema.ts';

export const invoicePaymentDtoSchema = z.object({
  id: idSchema,
  amountCents: positiveCentsSchema,
  paidOn: businessDateSchema,
  transactionId: idSchema.nullable(),
});

export const createInvoicePaymentRequestSchema = z.object({
  amountCents: positiveCentsSchema,
  paidOn: businessDateSchema,
  transactionId: idSchema.optional(),
});

export const invoicePaymentParamsSchema = z.object({
  accountId: idSchema,
  month: monthSchema,
  paymentId: idSchema,
});

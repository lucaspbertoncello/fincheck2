import { z } from 'zod';

import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import {
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from '../../common/money/money.schema.ts';
import { billPaymentDtoSchema } from '../bill-payment/bill-payment.schema.ts';
import { BILL_DIRECTIONS, BILL_KINDS, BILL_LIST_STATUSES, BILL_STATUSES } from './bill.constant.ts';

export const billDirectionSchema = z.enum(BILL_DIRECTIONS);
export const billKindSchema = z.enum(BILL_KINDS);

export const billOriginSchema = z.object({
  transactionId: idSchema,
  amountCents: positiveCentsSchema,
  occurredOn: businessDateSchema,
  description: z.string(),
});

export const billDtoSchema = z.object({
  id: idSchema,
  direction: billDirectionSchema,
  kind: billKindSchema,
  description: z.string().min(1).max(120),
  counterparty: z.string().min(1).max(80).nullable(),
  amountCents: positiveCentsSchema,
  paidCents: nonNegativeCentsSchema,
  remainingCents: nonNegativeCentsSchema,
  dueOn: businessDateSchema.nullable(),
  categoryId: idSchema.nullable(),
  status: z.enum(BILL_STATUSES),
  origin: billOriginSchema.nullable(),
  payments: z.array(billPaymentDtoSchema),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const billParamsSchema = z.object({ id: idSchema });

export const listBillsQuerySchema = z.object({
  status: z.enum(BILL_LIST_STATUSES).optional(),
  direction: billDirectionSchema.optional(),
  kind: billKindSchema.optional(),
});

export const billCounterpartyDtoSchema = z.object({
  name: z.string(),
  openBillsCount: z.int().nonnegative(),
});

export const billPaymentCandidateDtoSchema = z.object({
  transactionId: idSchema,
  description: z.string(),
  occurredOn: businessDateSchema,
  amountCents: centsSchema,
  accountId: idSchema,
  counterparty: z.string().nullable(),
});

export const listBillPaymentCandidatesQuerySchema = z.object({
  direction: billDirectionSchema,
  counterparty: z.string().max(80).optional(),
});

export const createBillRequestSchema = z
  .object({
    direction: billDirectionSchema,
    kind: billKindSchema,
    description: z.string().trim().min(1).max(120),
    counterparty: z.string().trim().min(1).max(80).optional(),
    amountCents: positiveCentsSchema,
    dueOn: businessDateSchema.optional(),
    categoryId: idSchema.optional(),
    origin: z
      .object({ transactionId: idSchema, amountCents: positiveCentsSchema.optional() })
      .optional(),
    payment: z.object({ transactionId: idSchema }).optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === 'friend' && !value.counterparty) {
      context.addIssue({
        code: 'custom',
        path: ['counterparty'],
        message: 'A friend debt needs the person',
      });
    }
    if (value.kind === 'friend' && value.direction === 'receivable' && value.categoryId) {
      context.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'A reimbursement is not income: no category',
      });
    }
  });

export const updateBillRequestSchema = z
  .strictObject({
    description: z.string().trim().min(1).max(120).optional(),
    counterparty: z.string().trim().min(1).max(80).optional(),
    amountCents: positiveCentsSchema.optional(),
    dueOn: businessDateSchema.nullable().optional(),
    categoryId: idSchema.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field',
  });

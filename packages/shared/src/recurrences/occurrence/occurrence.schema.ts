import { z } from 'zod';

import { businessDateSchema, instantSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import {
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from '../../common/money/money.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';
import { transactionMethodSchema } from '../../transactions/transaction/transaction.schema.ts';
import { RECURRENCE_KINDS } from '../recurrence/recurrence.constant.ts';
import {
  DIFFERENCE_DECISIONS,
  OCCURRENCE_LINKED_BY,
  OCCURRENCE_STATUSES,
} from './occurrence.constant.ts';

export const occurrenceStatusSchema = z.enum(OCCURRENCE_STATUSES);

export const occurrencePaymentSchema = z.object({
  id: idSchema,
  transactionId: idSchema,
  amountCents: positiveCentsSchema,
  occurredOn: businessDateSchema,
  linkedBy: z.enum(OCCURRENCE_LINKED_BY),
});

export const occurrenceDifferenceSchema = z.object({
  amountCents: centsSchema,
  decision: z.enum(DIFFERENCE_DECISIONS).nullable(),
});

export const occurrenceDtoSchema = z.object({
  id: idSchema,
  recurrenceId: idSchema,
  recurrenceName: z.string(),
  kind: z.enum(RECURRENCE_KINDS),
  month: monthSchema,
  expectedOn: businessDateSchema.nullable(),
  windowStartOn: businessDateSchema,
  windowEndOn: businessDateSchema,
  expectedAmountCents: positiveCentsSchema,
  receivedCents: nonNegativeCentsSchema,
  remainingCents: nonNegativeCentsSchema,
  status: occurrenceStatusSchema,
  settledAt: instantSchema.nullable(),
  skippedAt: instantSchema.nullable(),
  difference: occurrenceDifferenceSchema.nullable(),
  needsAttention: z.boolean(),
  carriedOver: z.boolean(),
  payments: z.array(occurrencePaymentSchema),
  accountId: idSchema.nullable(),
  method: transactionMethodSchema.nullable(),
});

export const occurrenceCandidateDtoSchema = z.object({
  transactionId: idSchema,
  description: z.string(),
  occurredOn: businessDateSchema,
  amountCents: centsSchema,
  accountId: idSchema,
  counterparty: z.string().nullable(),
});

export const occurrenceParamsSchema = z.object({ id: idSchema });
export const occurrencePaymentParamsSchema = z.object({ id: idSchema, paymentId: idSchema });

export const listOccurrencesQuerySchema = z.object({
  month: monthSchema,
  needsAttention: queryBooleanSchema.optional(),
});

export const updateOccurrenceRequestSchema = z.object({ expectedAmountCents: positiveCentsSchema });

export const linkOccurrencePaymentRequestSchema = z.object({ transactionId: idSchema });

export const decideOccurrenceDifferenceRequestSchema = z.object({
  decision: z.enum(['update', 'keep']),
});

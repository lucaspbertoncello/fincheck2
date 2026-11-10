import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { nonNegativeCentsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';
import { transactionOriginSchema } from '../transaction/transaction.schema.ts';
import { INSTALLMENT_LIMITS } from './installment-plan.constant.ts';

const installmentCountSchema = z.int().min(INSTALLMENT_LIMITS.min).max(INSTALLMENT_LIMITS.max);

export const installmentPlanItemDtoSchema = z.object({
  transactionId: idSchema,
  number: z.int().min(1),
  amountCents: positiveCentsSchema,
  invoiceMonth: monthSchema,
  occurredOn: businessDateSchema,
});

export const installmentPlanDtoSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  origin: transactionOriginSchema,
  description: z.string(),
  purchaseOn: businessDateSchema,
  totalCents: positiveCentsSchema,
  installmentCount: installmentCountSchema,
  firstInvoiceMonth: monthSchema,
  categoryId: idSchema.nullable(),
  installments: z.array(installmentPlanItemDtoSchema),
  nextInstallment: z
    .object({ number: z.int().min(1), invoiceMonth: monthSchema, amountCents: positiveCentsSchema })
    .nullable(),
  remainingCents: nonNegativeCentsSchema,
});

export const createInstallmentPlanRequestSchema = z.object({
  accountId: idSchema,
  description: z.string().trim().min(1).max(200),
  totalCents: positiveCentsSchema,
  installmentCount: installmentCountSchema,
  firstInvoiceMonth: monthSchema,
  purchaseOn: businessDateSchema,
  categoryId: idSchema.optional(),
  tagIds: z.array(idSchema).max(20).optional(),
});

// Edit of a plan: every field is optional, but at least one is sent. `categoryId: null` takes the
// category off (and the tags with it); `tagIds` replaces the tags of the parcels.
export const updateInstallmentPlanRequestSchema = z
  .strictObject({
    description: z.string().trim().min(1).max(200).optional(),
    totalCents: positiveCentsSchema.optional(),
    installmentCount: installmentCountSchema.optional(),
    firstInvoiceMonth: monthSchema.optional(),
    categoryId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(20).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field',
  });

export const listInstallmentPlansQuerySchema = z.object({
  accountId: idSchema.optional(),
  active: queryBooleanSchema.optional(),
});

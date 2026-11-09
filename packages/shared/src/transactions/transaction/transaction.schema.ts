import { z } from 'zod';

import { businessDateSchema, instantSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import { paginatedSchema } from '../../common/pagination/pagination.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';
import {
  TRANSACTION_CATEGORY_SOURCES,
  TRANSACTION_METHODS,
  TRANSACTION_NATURES,
  TRANSACTION_ORIGINS,
} from './transaction.constant.ts';

export const transactionOriginSchema = z.enum(TRANSACTION_ORIGINS);
export const transactionMethodSchema = z.enum(TRANSACTION_METHODS);
export const transactionNatureSchema = z.enum(TRANSACTION_NATURES);
export const transactionCategorySourceSchema = z.enum(TRANSACTION_CATEGORY_SOURCES);

export const transactionSplitDtoSchema = z.object({
  id: idSchema,
  position: z.int().min(1),
  amountCents: centsSchema,
  nature: z.enum(['expense', 'income', 'lent', 'reimbursed']),
  categoryId: idSchema.nullable(),
  description: z.string().nullable(),
});

export const transactionBankDtoSchema = z.object({
  description: z.string(),
  amountCents: centsSchema,
  occurredOn: businessDateSchema,
  counterparty: z.string().nullable(),
  status: z.enum(['pending', 'posted']),
});

export const transactionBankChangeDtoSchema = z.object({
  detectedAt: instantSchema,
  changes: z
    .array(
      z.discriminatedUnion('field', [
        z.object({ field: z.literal('description'), before: z.string(), after: z.string() }),
        z.object({
          field: z.literal('occurredOn'),
          before: businessDateSchema,
          after: businessDateSchema,
        }),
        z.object({ field: z.literal('amountCents'), before: centsSchema, after: centsSchema }),
      ]),
    )
    .min(1),
});

export const transactionInstallmentDtoSchema = z.object({
  planId: idSchema,
  number: z.int().min(1),
  count: z.int().min(2),
});

export const transactionLinksDtoSchema = z.object({
  occurrence: z.object({ occurrenceId: idSchema, recurrenceName: z.string() }).nullable(),
  bill: z
    .object({
      billId: idSchema,
      description: z.string(),
      counterparty: z.string().nullable(),
      role: z.enum(['payment', 'origin']),
      amountCents: positiveCentsSchema,
    })
    .nullable(),
  invoicePayment: z.object({ accountId: idSchema, month: monthSchema }).nullable(),
});

export const transactionDtoSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  origin: transactionOriginSchema,
  nature: transactionNatureSchema,
  natureSetBy: z.enum(['system', 'user']),
  method: transactionMethodSchema,
  description: z.string(),
  amountCents: centsSchema,
  occurredOn: businessDateSchema,
  competenceOn: businessDateSchema,
  invoiceMonth: monthSchema.nullable(),
  categoryId: idSchema.nullable(),
  categorySource: transactionCategorySourceSchema.nullable(),
  categoryRuleId: idSchema.nullable(),
  tagIds: z.array(idSchema),
  splits: z.array(transactionSplitDtoSchema),
  isEdited: z.boolean(),
  bank: transactionBankDtoSchema.nullable(),
  bankChange: transactionBankChangeDtoSchema.nullable(),
  removedByBankAt: instantSchema.nullable(),
  ignoredAt: instantSchema.nullable(),
  editNote: z.string().nullable(),
  installment: transactionInstallmentDtoSchema.nullable(),
  transferCounterpartId: idSchema.nullable(),
  links: transactionLinksDtoSchema,
  isInReview: z.boolean(),
  categorySuggestion: idSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

const descriptionSchema = z.string().trim().min(1).max(200);
const tagIdsSchema = z
  .array(idSchema)
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Tags must not repeat' });

export const createTransactionRequestSchema = z.object({
  type: z.enum(['expense', 'income']),
  accountId: idSchema,
  method: transactionMethodSchema,
  description: descriptionSchema,
  amountCents: positiveCentsSchema,
  occurredOn: businessDateSchema,
  categoryId: idSchema.optional(),
  tagIds: tagIdsSchema.optional(),
});

export const updateTransactionRequestSchema = z
  .strictObject({
    description: descriptionSchema.optional(),
    amountCents: positiveCentsSchema.optional(),
    occurredOn: businessDateSchema.optional(),
    categoryId: idSchema.nullable().optional(),
    tagIds: tagIdsSchema.optional(),
    nature: z.enum(['expense', 'income', 'transfer']).optional(),
    transferCounterpartId: idSchema.nullable().optional(),
    editNote: z.string().max(200).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field',
  });

export const listTransactionsQuerySchema = z
  .object({
    month: monthSchema.optional(),
    // A free period, both ends included, read page by page (Transações: 12 meses, Este ano, Tudo).
    from: businessDateSchema.optional(),
    to: businessDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    cursor: z.string().min(1).optional(),
    accountId: idSchema.optional(),
    categoryId: idSchema.optional(),
    uncategorized: queryBooleanSchema.optional(),
    tagId: idSchema.optional(),
    ruleId: idSchema.optional(),
    // true: only what pays an occurrence of a recurrence and enters the accounts (as the sum of the
    // cards does); false: only what has no link to an occurrence (a linked ignored one is in neither).
    recurrenceLinked: queryBooleanSchema.optional(),
    direction: z.enum(['out', 'in']).optional(),
    search: z.string().min(1).max(100).optional(),
    installmentPlanId: idSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.month && (value.cursor !== undefined || value.limit !== undefined)) {
      context.addIssue({ code: 'custom', path: ['month'], message: 'month has no pagination' });
    }
    if (value.month && (value.from !== undefined || value.to !== undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['month'],
        message: 'month does not combine with from or to',
      });
    }
    if (value.from !== undefined && value.to !== undefined && value.from > value.to) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'from is after to' });
    }
    if (value.categoryId && value.uncategorized) {
      context.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'categoryId does not combine with uncategorized',
      });
    }
  });

export const listTransactionsResponseSchema = paginatedSchema(transactionDtoSchema);

export const splitTransactionRequestSchema = z.object({
  parts: z
    .array(
      z.object({
        amountCents: positiveCentsSchema,
        categoryId: idSchema.optional(),
        description: z.string().max(100).optional(),
      }),
    )
    .length(2),
});

export const resolveBankChangeRequestSchema = z.object({ use: z.enum(['bank', 'mine']) });

import { z } from 'zod';

import { businessDateSchema, instantSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, nonNegativeCentsSchema } from '../../common/money/money.schema.ts';
import { normalizeText } from '../../common/text/normalize-text.util.ts';
import { previousStateSchema } from '../../transactions/transaction-bulk/transaction-bulk.schema.ts';
import { categoryKindSchema } from '../category/category.schema.ts';

export const ruleDtoSchema = z.object({
  id: idSchema,
  descriptionContains: z.string(),
  kind: categoryKindSchema.nullable(),
  accountId: idSchema.nullable(),
  amountMinCents: nonNegativeCentsSchema.nullable(),
  amountMaxCents: nonNegativeCentsSchema.nullable(),
  categoryId: idSchema.nullable(),
  tagIds: z.array(idSchema),
  enabled: z.boolean(),
  appliedCount: z.int().nonnegative(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const ruleExampleSchema = z.object({
  transactionId: idSchema,
  description: z.string(),
  occurredOn: businessDateSchema,
  amountCents: centsSchema,
  fromCategoryId: idSchema.nullable(),
  toCategoryId: idSchema.nullable(),
});

// The back always normalizes again; the saved text is the normalized one (2 to 100 characters).
const descriptionContainsSchema = z
  .string()
  .transform(normalizeText)
  .pipe(z.string().min(2).max(100));

const amountRangeIsValid = (value: {
  amountMinCents?: number | null | undefined;
  amountMaxCents?: number | null | undefined;
}) =>
  value.amountMinCents == null ||
  value.amountMaxCents == null ||
  value.amountMaxCents >= value.amountMinCents;

const amountRangeIssue = {
  message: 'amountMaxCents must not be below amountMinCents',
  path: ['amountMaxCents'],
};

// Condition and action fields shared by the preview, create and update bodies.
export const ruleConditionSchema = z.object({
  descriptionContains: descriptionContainsSchema,
  kind: categoryKindSchema.optional(),
  accountId: idSchema.optional(),
  amountMinCents: nonNegativeCentsSchema.optional(),
  amountMaxCents: nonNegativeCentsSchema.optional(),
  categoryId: idSchema.optional(),
  tagIds: z.array(idSchema).max(10).optional(),
});

export const previewRuleRequestSchema = ruleConditionSchema.refine(
  amountRangeIsValid,
  amountRangeIssue,
);

export const rulePreviewSchema = z.object({
  matchCount: z.int().nonnegative(),
  willChangeCount: z.int().nonnegative(),
  examples: z.array(ruleExampleSchema).max(3),
});

export const createRuleRequestSchema = ruleConditionSchema
  .extend({ applyToHistory: z.boolean().optional() })
  .refine(amountRangeIsValid, amountRangeIssue);

export const createRuleResultSchema = z.object({
  rule: ruleDtoSchema,
  applied: z
    .object({ changedCount: z.int().nonnegative(), previous: z.array(previousStateSchema) })
    .nullable(),
});

export const updateRuleRequestSchema = z
  .strictObject({
    descriptionContains: descriptionContainsSchema.optional(),
    kind: categoryKindSchema.nullable().optional(),
    accountId: idSchema.nullable().optional(),
    amountMinCents: nonNegativeCentsSchema.nullable().optional(),
    amountMaxCents: nonNegativeCentsSchema.nullable().optional(),
    categoryId: idSchema.nullable().optional(),
    tagIds: z.array(idSchema).max(10).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field',
  })
  .refine(amountRangeIsValid, amountRangeIssue);

export const applyRuleResultSchema = z.object({
  changedCount: z.int().nonnegative(),
  previous: z.array(previousStateSchema),
});

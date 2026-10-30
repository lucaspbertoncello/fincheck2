import { z } from 'zod';

import { businessDateSchema, instantSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { centsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import { queryBooleanSchema } from '../../common/query/query.schema.ts';
import { transactionMethodSchema } from '../../transactions/transaction/transaction.schema.ts';
import { occurrenceDtoSchema } from '../occurrence/occurrence.schema.ts';
import {
  AMOUNT_MODES,
  BUSINESS_DAY_NUMBER_LIMITS,
  DATE_RULE_TYPES,
  EMPLOYMENT_REGIMES,
  MAX_PAYMENTS_LIMITS,
  RECURRENCE_KINDS,
  TOLERANCE_DAYS_LIMITS,
} from './recurrence.constant.ts';

export const recurrenceKindSchema = z.enum(RECURRENCE_KINDS);
export const amountModeSchema = z.enum(AMOUNT_MODES);
export const employmentRegimeSchema = z.enum(EMPLOYMENT_REGIMES);
export const applyFromSchema = z.enum(['next_month', 'current_month']);

const maxPaymentsSchema = z.int().min(MAX_PAYMENTS_LIMITS.min).max(MAX_PAYMENTS_LIMITS.max);

// The four fields are always in the answer, `null` in the ones the rule does not use.
export const dateRuleSchema = z
  .object({
    type: z.enum(DATE_RULE_TYPES),
    day: z.int().min(1).max(31).nullable().default(null),
    businessDayNumber: z
      .int()
      .min(BUSINESS_DAY_NUMBER_LIMITS.min)
      .max(BUSINESS_DAY_NUMBER_LIMITS.max)
      .nullable()
      .default(null),
    toleranceDays: z
      .int()
      .min(TOLERANCE_DAYS_LIMITS.min)
      .max(TOLERANCE_DAYS_LIMITS.max)
      .nullable()
      .default(null),
  })
  .superRefine((rule, context) => {
    const requires = (field: 'day' | 'businessDayNumber' | 'toleranceDays') => {
      if (rule[field] === null) {
        context.addIssue({ code: 'custom', path: [field], message: `${rule.type} needs ${field}` });
      }
    };
    const forbids = (field: 'day' | 'businessDayNumber' | 'toleranceDays') => {
      if (rule[field] !== null) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: `${rule.type} has no ${field}`,
        });
      }
    };

    switch (rule.type) {
      case 'fixed_day':
        requires('day');
        forbids('businessDayNumber');
        forbids('toleranceDays');
        break;
      case 'business_day':
        requires('businessDayNumber');
        forbids('day');
        forbids('toleranceDays');
        break;
      case 'around_day':
        requires('day');
        requires('toleranceDays');
        forbids('businessDayNumber');
        break;
      case 'any_day':
        forbids('businessDayNumber');
        forbids('toleranceDays');
        break;
    }
  });

export const recurrenceDtoSchema = z.object({
  id: idSchema,
  kind: recurrenceKindSchema,
  name: z.string().min(1).max(80),
  expectedAmountCents: positiveCentsSchema,
  amountMode: amountModeSchema,
  counterparty: z.string().max(120).nullable(),
  matchText: z.string().max(80).nullable(),
  employmentRegime: employmentRegimeSchema.nullable(),
  accountId: idSchema.nullable(),
  method: transactionMethodSchema.nullable(),
  categoryId: idSchema.nullable(),
  dateRule: dateRuleSchema,
  maxPayments: maxPaymentsSchema,
  startsMonth: monthSchema,
  pausedAt: instantSchema.nullable(),
  archivedAt: instantSchema.nullable(),
  createdAt: instantSchema,
  updatedAt: instantSchema,
});

export const recurrenceDetailDtoSchema = recurrenceDtoSchema.extend({
  history: z.array(occurrenceDtoSchema),
});

export const recurrenceListItemSchema = recurrenceDtoSchema.extend({
  occurrence: occurrenceDtoSchema.nullable(),
});

export const recurrenceSummarySchema = z.object({
  incomes: z.object({
    expectedCents: centsSchema,
    receivedCents: centsSchema,
    count: z.int().nonnegative(),
  }),
  expenses: z.object({
    expectedCents: centsSchema,
    paidCount: z.int().nonnegative(),
    lateCount: z.int().nonnegative(),
    differentCount: z.int().nonnegative(),
    count: z.int().nonnegative(),
  }),
});

export const recurrenceParamsSchema = z.object({ id: idSchema });

export const listRecurrencesQuerySchema = z.object({
  month: monthSchema,
  includeArchived: queryBooleanSchema.default(false),
});

export const summaryRecurrencesQuerySchema = z.object({ month: monthSchema });

export const createRecurrenceRequestSchema = z.object({
  kind: recurrenceKindSchema,
  name: z.string().trim().min(1).max(80),
  expectedAmountCents: positiveCentsSchema,
  amountMode: amountModeSchema.optional(),
  counterparty: z.string().max(120).optional(),
  matchText: z.string().max(80).optional(),
  employmentRegime: employmentRegimeSchema.optional(),
  accountId: idSchema.optional(),
  method: transactionMethodSchema.optional(),
  categoryId: idSchema.optional(),
  dateRule: dateRuleSchema,
  maxPayments: maxPaymentsSchema.optional(),
  startsMonth: monthSchema.optional(),
  linkTransactionId: idSchema.optional(),
});

export const createRecurrenceResponseSchema = z.object({
  recurrence: recurrenceDtoSchema,
  occurrence: occurrenceDtoSchema.nullable(),
});

export const updateRecurrenceRequestSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(80).optional(),
    expectedAmountCents: positiveCentsSchema.optional(),
    amountMode: amountModeSchema.optional(),
    counterparty: z.string().max(120).nullable().optional(),
    matchText: z.string().max(80).nullable().optional(),
    employmentRegime: employmentRegimeSchema.nullable().optional(),
    accountId: idSchema.nullable().optional(),
    method: transactionMethodSchema.nullable().optional(),
    categoryId: idSchema.nullable().optional(),
    dateRule: dateRuleSchema.optional(),
    maxPayments: maxPaymentsSchema.optional(),
    startsMonth: monthSchema.optional(),
    applyFrom: applyFromSchema.optional(),
  })
  .refine(
    (value) => Object.entries(value).some(([key, v]) => key !== 'applyFrom' && v !== undefined),
    {
      message: 'Send at least one field besides applyFrom',
    },
  );

export const previewRecurrenceRequestSchema = z.object({
  dateRule: dateRuleSchema,
  startsMonth: monthSchema.optional(),
});

export const previewRecurrenceResponseSchema = z.object({
  occurrences: z.array(
    z.object({
      month: monthSchema,
      expectedOn: businessDateSchema.nullable(),
      windowStartOn: businessDateSchema,
      windowEndOn: businessDateSchema,
    }),
  ),
});

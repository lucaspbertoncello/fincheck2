import { z } from 'zod';

import { positiveCentsSchema } from '../../common/money/money.schema.ts';

export const CREDIT_CARD_BRANDS = [
  'visa',
  'mastercard',
  'elo',
  'amex',
  'hipercard',
  'other',
] as const;

export const creditCardBrandSchema = z.enum(CREDIT_CARD_BRANDS);

const dayOfMonthSchema = z.int().min(1).max(31);
const last4Schema = z.string().regex(/^\d{4}$/);

export const creditCardDtoSchema = z.object({
  brand: creditCardBrandSchema,
  last4: last4Schema.nullable(),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  limitCents: positiveCentsSchema.nullable(),
  themeId: z.string().nullable(),
});

export const createCreditCardRequestSchema = z.object({
  brand: creditCardBrandSchema,
  last4: last4Schema.optional(),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  limitCents: positiveCentsSchema.optional(),
  themeId: z.string().min(1).max(64).optional(),
});

export const updateCreditCardRequestSchema = z.object({
  brand: creditCardBrandSchema.optional(),
  last4: last4Schema.nullable().optional(),
  closingDay: dayOfMonthSchema.optional(),
  dueDay: dayOfMonthSchema.optional(),
  limitCents: positiveCentsSchema.nullable().optional(),
  themeId: z.string().min(1).max(64).nullable().optional(),
});

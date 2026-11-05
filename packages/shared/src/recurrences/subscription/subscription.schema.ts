import { z } from 'zod';

import { businessDateSchema, monthSchema } from '../../common/date/date.schema.ts';
import { idSchema } from '../../common/id/id.schema.ts';
import { nonNegativeCentsSchema, positiveCentsSchema } from '../../common/money/money.schema.ts';
import {
  createRecurrenceResponseSchema,
  recurrenceListItemSchema,
} from '../recurrence/recurrence.schema.ts';
import { SUBSCRIPTION_STATUSES } from './subscription.constant.ts';

export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

export const subscriptionAlertSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('price_changed'),
    fromCents: positiveCentsSchema,
    toCents: positiveCentsSchema,
  }),
  z.object({ kind: z.literal('missed') }),
  z.object({
    kind: z.literal('charged_after_end'),
    amountCents: positiveCentsSchema,
    occurredOn: businessDateSchema,
    transactionId: idSchema,
  }),
]);

export const subscriptionItemSchema = z.object({
  recurrence: recurrenceListItemSchema,
  chargeDay: z.int().min(1).max(31),
  status: subscriptionStatusSchema,
  lastChargeCents: positiveCentsSchema.nullable(),
  alert: subscriptionAlertSchema.nullable(),
});

// Only the active subscriptions count; the yearly total is the monthly one times 12.
export const subscriptionSummarySchema = z.object({
  activeCount: z.int().nonnegative(),
  monthlyTotalCents: nonNegativeCentsSchema,
  yearlyTotalCents: nonNegativeCentsSchema,
});

// `key` is the normalized description plus the card.
export const subscriptionSuggestionSchema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
  accountId: idSchema,
  lastAmountCents: positiveCentsSchema,
  lastChargedOn: businessDateSchema,
  monthsSeen: z.int().min(2),
  transactionIds: z.array(idSchema).min(1),
});

export const listSubscriptionsQuerySchema = z.object({ month: monthSchema.optional() });

export const listSubscriptionsResponseSchema = z.object({
  summary: subscriptionSummarySchema,
  items: z.array(subscriptionItemSchema),
  suggestions: z.array(subscriptionSuggestionSchema),
});

// Besides the key, the fields of `POST /recurrences` that overwrite what the suggestion proposes.
export const acceptSubscriptionSuggestionRequestSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  categoryId: idSchema.optional(),
  counterparty: z.string().max(120).optional(),
  matchText: z.string().max(80).optional(),
});

export const acceptSubscriptionSuggestionResponseSchema = createRecurrenceResponseSchema;

export const dismissSubscriptionSuggestionRequestSchema = z.object({ key: z.string().min(1) });

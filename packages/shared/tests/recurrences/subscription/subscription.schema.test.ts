import { describe, expect, it } from 'vitest';

import {
  SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS,
  SUBSCRIPTION_SUGGESTION_LIMITS,
} from '#/recurrences/subscription/subscription.constant.ts';
import {
  acceptSubscriptionSuggestionRequestSchema,
  dismissSubscriptionSuggestionRequestSchema,
  listSubscriptionsQuerySchema,
  listSubscriptionsResponseSchema,
  subscriptionAlertSchema,
  subscriptionSuggestionSchema,
  subscriptionSummarySchema,
} from '#/recurrences/subscription/subscription.schema.ts';

const ID = '0194f3a0-0000-7000-8000-000000000001';

describe('subscription schemas', () => {
  it('keeps the limits of BR-REC-017', () => {
    expect(SUBSCRIPTION_SUGGESTION_LIMITS).toEqual({
      amountTolerance: 0.15,
      dayTolerance: 5,
      minMonths: 2,
    });
    expect(SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS).toBe(50);
  });

  it('lists by month, which is optional (it defaults to the current one)', () => {
    expect(listSubscriptionsQuerySchema.safeParse({}).success).toBe(true);
    expect(listSubscriptionsQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(listSubscriptionsQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false);
  });

  it('reads the three alerts by their kind and nothing else', () => {
    expect(
      subscriptionAlertSchema.safeParse({ kind: 'price_changed', fromCents: 5590, toCents: 5990 })
        .success,
    ).toBe(true);
    expect(subscriptionAlertSchema.safeParse({ kind: 'missed' }).success).toBe(true);
    expect(
      subscriptionAlertSchema.safeParse({
        kind: 'charged_after_end',
        amountCents: 5590,
        occurredOn: '2026-10-20',
        transactionId: ID,
      }).success,
    ).toBe(true);
    expect(
      subscriptionAlertSchema.safeParse({ kind: 'price_changed', fromCents: 5590 }).success,
    ).toBe(false);
    expect(subscriptionAlertSchema.safeParse({ kind: 'cancelled' }).success).toBe(false);
  });

  it('wants a suggestion seen in at least two months, with a charge behind it', () => {
    const suggestion = {
      key: 'STREAMFLIX|card',
      description: 'STREAMFLIX',
      accountId: ID,
      lastAmountCents: 5590,
      lastChargedOn: '2026-10-20',
      monthsSeen: 2,
      transactionIds: [ID],
    };
    expect(subscriptionSuggestionSchema.safeParse(suggestion).success).toBe(true);
    expect(subscriptionSuggestionSchema.safeParse({ ...suggestion, monthsSeen: 1 }).success).toBe(
      false,
    );
    expect(
      subscriptionSuggestionSchema.safeParse({ ...suggestion, transactionIds: [] }).success,
    ).toBe(false);
  });

  it('summarizes with counts and totals that are never negative', () => {
    expect(
      subscriptionSummarySchema.safeParse({
        activeCount: 4,
        monthlyTotalCents: 20_000,
        yearlyTotalCents: 240_000,
      }).success,
    ).toBe(true);
    expect(
      subscriptionSummarySchema.safeParse({
        activeCount: 0,
        monthlyTotalCents: -1,
        yearlyTotalCents: 0,
      }).success,
    ).toBe(false);
    expect(
      listSubscriptionsResponseSchema.safeParse({
        summary: { activeCount: 0, monthlyTotalCents: 0, yearlyTotalCents: 0 },
        items: [],
        suggestions: [],
      }).success,
    ).toBe(true);
  });

  it('accepts a suggestion by key, with optional overrides, and dismisses by key', () => {
    expect(acceptSubscriptionSuggestionRequestSchema.safeParse({ key: 'A|B' }).success).toBe(true);
    expect(
      acceptSubscriptionSuggestionRequestSchema.safeParse({
        key: 'A|B',
        name: ' Streaming ',
        categoryId: ID,
      }).data?.name,
    ).toBe('Streaming');
    expect(
      acceptSubscriptionSuggestionRequestSchema.safeParse({ key: 'A|B', serviceSlug: 'netflix' })
        .success,
    ).toBe(true);
    expect(
      acceptSubscriptionSuggestionRequestSchema.safeParse({ key: 'A|B', serviceSlug: null })
        .success,
    ).toBe(true);
    expect(
      acceptSubscriptionSuggestionRequestSchema.safeParse({ key: 'A|B', serviceSlug: 'nope' })
        .success,
    ).toBe(false);
    expect(acceptSubscriptionSuggestionRequestSchema.safeParse({}).success).toBe(false);
    expect(dismissSubscriptionSuggestionRequestSchema.safeParse({ key: '' }).success).toBe(false);
  });
});

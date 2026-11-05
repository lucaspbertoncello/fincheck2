import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

// Only the active subscriptions count; the yearly total is the monthly one times 12.
export function computeSubscriptionSummary(items: Subscription.Item[]): Subscription.Summary {
  const active = items.filter((item) => !item.recurrence.pausedAt && !item.recurrence.archivedAt);
  const monthlyTotalCents = active.reduce(
    (sum, item) => sum + item.recurrence.expectedAmountCents,
    0,
  );

  return {
    activeCount: active.length,
    monthlyTotalCents,
    yearlyTotalCents: monthlyTotalCents * 12,
  };
}

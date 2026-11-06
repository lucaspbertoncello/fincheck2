import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { describe, expect, it } from 'vitest';

import { presentSubscriptionRow } from '#/features/recurrences/subscription-list/utils/present-subscription-row.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

const context = {
  accountNames: new Map<string, string>(),
  categoryIcons: new Map<string, string>(),
  today: '2026-10-22',
  hidden: false,
  pendingKey: null,
};

function item(overrides: Partial<Subscription.Item['recurrence']>): Subscription.Item {
  return {
    recurrence: {
      ...createTestRecurrence({ method: 'credit', isSubscription: true }),
      occurrence: null,
      ...overrides,
    },
    chargeDay: 20,
    status: 'upcoming',
    lastChargeCents: null,
    alert: null,
  };
}

describe('presentSubscriptionRow', () => {
  it('draws the logo of the service the subscription is flagged with, not the one its name suggests', () => {
    const row = presentSubscriptionRow(
      item({ name: 'Streamflix', serviceSlug: 'netflix' }),
      context,
    );

    expect(row.service).toEqual({ name: 'Netflix', slug: 'netflix' });
  });

  it('keeps the category icon for "Outro", even when the name looks like a service', () => {
    const row = presentSubscriptionRow(
      item({ name: 'Spotify do amigo', serviceSlug: null }),
      context,
    );

    expect(row.service).toBeNull();
  });

  it('keeps the category icon for a service that has no logo file', () => {
    const row = presentSubscriptionRow(
      item({ name: 'Disney+', serviceSlug: 'disneyplus' }),
      context,
    );

    expect(row.service).toBeNull();
  });
});

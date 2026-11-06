import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/** A recurrence on a fixed day, as the API returns it; each test overrides what it needs. */
export function createTestRecurrence(overrides: Partial<Recurrence.Dto> = {}): Recurrence.Dto {
  return {
    id: 'recurrence-1',
    kind: 'expense',
    name: 'Academia',
    expectedAmountCents: 10_990,
    amountMode: 'fixed',
    counterparty: null,
    matchText: null,
    employmentRegime: null,
    accountId: null,
    method: null,
    categoryId: null,
    isSubscription: false,
    serviceSlug: null,
    dateRule: {
      type: 'fixed_day',
      day: 25,
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: 'none',
    },
    maxPayments: 1,
    startsMonth: '2026-07',
    pausedAt: null,
    archivedAt: null,
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

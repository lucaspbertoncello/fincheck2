import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

/** An expense occurrence of October 2026, still expected; each test overrides what it needs. */
export function createTestOccurrence(overrides: Partial<Occurrence.Dto> = {}): Occurrence.Dto {
  return {
    id: 'occurrence-1',
    recurrenceId: 'recurrence-1',
    recurrenceName: 'Academia',
    kind: 'expense',
    month: '2026-10',
    expectedOn: '2026-10-25',
    windowStartOn: '2026-10-22',
    windowEndOn: '2026-10-28',
    expectedAmountCents: 10_990,
    receivedCents: 0,
    remainingCents: 10_990,
    status: 'expected',
    settledAt: null,
    skippedAt: null,
    difference: null,
    needsAttention: false,
    carriedOver: false,
    payments: [],
    accountId: null,
    method: null,
    ...overrides,
  };
}

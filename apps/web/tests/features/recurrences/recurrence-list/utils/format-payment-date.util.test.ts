import { describe, expect, it } from 'vitest';

import { formatPaymentDate } from '#/features/recurrences/recurrence-list/utils/format-payment-date.util.ts';

describe('formatPaymentDate', () => {
  it('writes day and month for a day of this year', () => {
    expect(formatPaymentDate('2026-10-07', '2026-11-09')).toBe('07/10');
  });

  it('adds the year when the day is from another year', () => {
    expect(formatPaymentDate('2025-12-30', '2026-01-05')).toBe('30/12/2025');
  });
});

import { describe, expect, it } from 'vitest';

import { formatMonthShort } from '#/features/transactions/installment-plans/utils/format-month-short.util.ts';

describe('formatMonthShort', () => {
  it('writes the month in three letters and the two digits of the year', () => {
    expect(formatMonthShort('2026-05')).toBe('mai/26');
    expect(formatMonthShort('2027-12')).toBe('dez/27');
  });
});

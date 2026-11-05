import { describe, expect, it } from 'vitest';

import { formatPeriodRange } from '#/features/transactions/transaction-list/utils/format-period-range.util.ts';
import { resolvePeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

describe('formatPeriodRange', () => {
  it('writes the range that takes the month place, and nothing for the month', () => {
    const today = '2026-10-22';

    expect(formatPeriodRange('12m', resolvePeriodRange('12m', today))).toBe('nov 2025 – out 2026');
    expect(formatPeriodRange('year', resolvePeriodRange('year', today))).toBe('2026');
    expect(formatPeriodRange('all', {})).toBe('Tudo');
    expect(formatPeriodRange('month', {})).toBeNull();
  });

  it('is never wider than the window the picker keeps for it ("mmm 0000 – mmm 0000")', () => {
    for (let month = 1; month <= 12; month += 1) {
      const today = `2026-${String(month).padStart(2, '0')}-15`;
      const label = formatPeriodRange('12m', resolvePeriodRange('12m', today));

      expect(label).toMatch(/^[a-z]{3} \d{4} – [a-z]{3} \d{4}$/);
    }
  });
});

import { describe, expect, it } from 'vitest';

import { resolvePeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

describe('resolvePeriodRange', () => {
  it('"12 meses" is the 11 months before this one and this one, whole months', () => {
    expect(resolvePeriodRange('12m', '2026-10-22')).toEqual({
      from: '2025-11-01',
      to: '2026-10-31',
    });
  });

  it('crosses the year and takes the real last day of the month', () => {
    expect(resolvePeriodRange('12m', '2026-02-10')).toEqual({
      from: '2025-03-01',
      to: '2026-02-28',
    });
    expect(resolvePeriodRange('12m', '2028-02-10')).toEqual({
      from: '2027-03-01',
      to: '2028-02-29',
    });
    expect(resolvePeriodRange('12m', '2026-01-01')).toEqual({
      from: '2025-02-01',
      to: '2026-01-31',
    });
  });

  it('"Este ano" is January to December of this year', () => {
    expect(resolvePeriodRange('year', '2026-10-22')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('the month and "Tudo" have no range', () => {
    expect(resolvePeriodRange('month', '2026-10-22')).toEqual({});
    expect(resolvePeriodRange('all', '2026-10-22')).toEqual({});
  });
});

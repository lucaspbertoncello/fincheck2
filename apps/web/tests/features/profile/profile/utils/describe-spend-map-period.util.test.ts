import { describe, expect, it } from 'vitest';

import { describeSpendMapPeriod } from '#/features/profile/profile/utils/describe-spend-map-period.util.ts';
import { resolveSpendMapView } from '#/features/profile/profile/utils/resolve-spend-map-view.util.ts';

describe('describeSpendMapPeriod', () => {
  it('names the year or the month for a screen reader', () => {
    expect(describeSpendMapPeriod('year', '2026-10')).toBe('Gasto por dia em 2026');
    expect(describeSpendMapPeriod('month', '2026-03')).toBe('Gasto por dia em março de 2026');
  });
});

describe('resolveSpendMapView', () => {
  it('is month for the ends of one calendar month and year for anything longer', () => {
    expect(resolveSpendMapView('2026-10-01', '2026-10-31')).toBe('month');
    expect(resolveSpendMapView('2026-01-01', '2026-12-31')).toBe('year');
    expect(resolveSpendMapView('2025-11-01', '2026-10-22')).toBe('year');
  });
});

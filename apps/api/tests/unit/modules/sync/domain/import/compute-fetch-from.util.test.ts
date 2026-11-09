import { describe, expect, it } from 'vitest';

import { computeFetchFrom } from '#/modules/sync/domain/import/compute-fetch-from.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const TODAY = BusinessDate.of('2026-11-09');

describe('computeFetchFrom', () => {
  it('without a cursor (the first round, or an account just adopted) asks for the whole 365 days', () => {
    expect(computeFetchFrom(null, TODAY)).toBe('2025-11-09');
  });

  it('with a cursor asks from 30 days before it, to catch a change or a removal', () => {
    expect(computeFetchFrom('2026-11-08', TODAY)).toBe('2026-10-09');
  });

  it('crosses the end of the year', () => {
    expect(computeFetchFrom('2026-01-10', TODAY)).toBe('2025-12-11');
  });

  it('the leap year is counted', () => {
    expect(computeFetchFrom(null, BusinessDate.of('2028-03-01'))).toBe('2027-03-02');
  });
});

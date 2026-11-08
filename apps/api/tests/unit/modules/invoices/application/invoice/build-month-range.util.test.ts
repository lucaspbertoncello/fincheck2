import { describe, expect, it } from 'vitest';

import { buildMonthRange } from '#/modules/invoices/application/invoice/build-month-range.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const range = (from: string, to: string) =>
  buildMonthRange(Month.of(from), Month.of(to)).map((month) => month.value);

describe('buildMonthRange', () => {
  it('is one month when from equals to', () => {
    expect(range('2026-11', '2026-11')).toEqual(['2026-11']);
  });

  it('includes both ends, oldest first', () => {
    expect(range('2026-08', '2026-11')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('crosses the year', () => {
    expect(range('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('is empty when from is after to', () => {
    expect(range('2026-11', '2026-10')).toEqual([]);
    expect(range('2027-01', '2026-12')).toEqual([]);
  });

  it('returns Month objects', () => {
    expect(buildMonthRange(Month.of('2026-11'), Month.of('2026-12'))[0]).toBeInstanceOf(Month);
  });
});

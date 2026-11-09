import { describe, expect, it } from 'vitest';

import { listLookbackMonths } from '#/modules/invoices/application/invoice/list-lookback-months.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

describe('listLookbackMonths', () => {
  const open = Month.of('2026-11');

  it('keeps the last three months before the open one that have activity, oldest first, once each', () => {
    const months = listLookbackMonths(open, [
      '2026-10',
      '2026-08',
      '2026-10',
      '2026-09',
      '2026-07',
      '2026-05',
    ]);

    expect(months.map((month) => month.value)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('leaves out the open month, the later ones and the months with nothing', () => {
    expect(listLookbackMonths(open, ['2026-11', '2026-12', '2027-01'])).toEqual([]);
    expect(listLookbackMonths(open, [])).toEqual([]);
  });

  it('crosses the year', () => {
    const months = listLookbackMonths(Month.of('2027-01'), [
      '2026-10',
      '2026-11',
      '2026-12',
      '2026-09',
    ]);

    expect(months.map((month) => month.value)).toEqual(['2026-10', '2026-11', '2026-12']);
  });
});

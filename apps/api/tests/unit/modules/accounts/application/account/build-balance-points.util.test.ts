import { describe, expect, it } from 'vitest';

import { buildBalancePoints } from '#/modules/accounts/application/account/build-balance-points.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const day = (value: string) => BusinessDate.of(value);

describe('buildBalancePoints', () => {
  it('manual account: the opening balance plus the days added up, one point a day', () => {
    const points = buildBalancePoints({
      first: day('2026-11-01'),
      last: day('2026-11-04'),
      netByDay: new Map([
        ['2026-11-02', -1000],
        ['2026-11-04', 500],
      ]),
      kind: { source: 'manual', openingCents: 10000 },
    });

    expect(points).toEqual([
      { date: '2026-11-01', balanceCents: 10000 },
      { date: '2026-11-02', balanceCents: 9000 },
      { date: '2026-11-03', balanceCents: 9000 },
      { date: '2026-11-04', balanceCents: 9500 },
    ]);
  });

  it('Pluggy account: from the back, the bank balance minus what moved after each day', () => {
    // Bank says 9500 today (11-04). Moved 11-02 (-1000) and 11-04 (+500).
    const points = buildBalancePoints({
      first: day('2026-11-01'),
      last: day('2026-11-04'),
      netByDay: new Map([
        ['2026-11-02', -1000],
        ['2026-11-04', 500],
      ]),
      kind: { source: 'pluggy', bankBalanceCents: 9500 },
    });

    expect(points).toEqual([
      { date: '2026-11-01', balanceCents: 10000 },
      { date: '2026-11-02', balanceCents: 9000 },
      { date: '2026-11-03', balanceCents: 9000 },
      { date: '2026-11-04', balanceCents: 9500 },
    ]);
  });

  it('Pluggy account in a past month: the movement after the month still counts', () => {
    // October ends on 31; on 11-03 the account moved -700. Bank today (11-05) says 3000.
    const points = buildBalancePoints({
      first: day('2026-10-30'),
      last: day('2026-10-31'),
      netByDay: new Map([['2026-11-03', -700]]),
      kind: { source: 'pluggy', bankBalanceCents: 3000 },
    });

    expect(points).toEqual([
      { date: '2026-10-30', balanceCents: 3700 },
      { date: '2026-10-31', balanceCents: 3700 },
    ]);
  });

  it('gives a single point when the first and the last day are the same', () => {
    expect(
      buildBalancePoints({
        first: day('2026-11-01'),
        last: day('2026-11-01'),
        netByDay: new Map(),
        kind: { source: 'manual', openingCents: 0 },
      }),
    ).toEqual([{ date: '2026-11-01', balanceCents: 0 }]);
  });
});

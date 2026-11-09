import { describe, expect, it } from 'vitest';

import { computeCardDays } from '#/modules/sync/domain/import/compute-card-days.util.ts';

describe('computeCardDays', () => {
  it('keeps the days the bank sent', () => {
    expect(computeCardDays({ closingDay: 5, dueDay: 12, invoiceDueOns: [] })).toEqual({
      closingDay: 5,
      dueDay: 12,
    });
  });

  it('with no due day takes the one of the latest invoice the bank closed', () => {
    expect(
      computeCardDays({
        closingDay: null,
        dueDay: null,
        invoiceDueOns: ['2026-09-20', '2026-10-20', '2026-08-20'],
      }),
    ).toEqual({ closingDay: 13, dueDay: 20 });
  });

  it('with nothing at all it is the 10th, and the closing 7 days before', () => {
    expect(computeCardDays({ closingDay: null, dueDay: null, invoiceDueOns: [] })).toEqual({
      closingDay: 3,
      dueDay: 10,
    });
  });

  it('the closing before the 1st goes to the end of the month before', () => {
    expect(computeCardDays({ closingDay: null, dueDay: 5, invoiceDueOns: [] })).toEqual({
      closingDay: 28,
      dueDay: 5,
    });
  });

  it('a closing day the bank sent wins over the gap', () => {
    expect(computeCardDays({ closingDay: 25, dueDay: 1, invoiceDueOns: [] })).toEqual({
      closingDay: 25,
      dueDay: 1,
    });
  });
});

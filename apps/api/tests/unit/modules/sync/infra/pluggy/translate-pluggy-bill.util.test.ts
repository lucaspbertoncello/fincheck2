import { describe, expect, it } from 'vitest';

import { translatePluggyBill } from '#/modules/sync/infra/pluggy/translate-pluggy-bill.util.ts';

describe('translatePluggyBill', () => {
  it.each([
    ['2026-11-05T00:00:00.000Z', 1234.56, '2026-11-05', 123456],
    ['2026-11-05T02:30:00.000Z', 0.29, '2026-11-04', 29],
    ['2026-11-05', 10.1, '2026-11-05', 1010],
    // The total is always the absolute value.
    ['2026-11-05T00:00:00.000Z', -500, '2026-11-05', 50000],
  ])('due %s, total %s is %s with %s cents', (dueDate, totalAmount, dueOn, totalCents) => {
    expect(translatePluggyBill({ id: 'bill-1', dueDate, totalAmount })).toEqual({
      id: 'bill-1',
      dueOn,
      totalCents,
    });
  });

  it('refuses the total of an invoice in another currency (it is not reais)', () => {
    expect(
      translatePluggyBill({
        id: 'bill-1',
        dueDate: '2026-11-05',
        totalAmount: 100,
        totalAmountCurrencyCode: 'USD',
      }),
    ).toBeNull();
    expect(
      translatePluggyBill({
        id: 'bill-1',
        dueDate: '2026-11-05',
        totalAmount: 100,
        totalAmountCurrencyCode: 'BRL',
      }),
    ).toEqual({ id: 'bill-1', dueOn: '2026-11-05', totalCents: 10000 });
  });

  it('throws when the body is not what was documented', () => {
    expect(() => translatePluggyBill({ id: 'bill-1', dueDate: 'x', totalAmount: 1 })).toThrow(
      TypeError,
    );
    expect(() =>
      translatePluggyBill({ id: 'bill-1', dueDate: '2026-11-05', totalAmount: null as never }),
    ).toThrow(TypeError);
  });
});

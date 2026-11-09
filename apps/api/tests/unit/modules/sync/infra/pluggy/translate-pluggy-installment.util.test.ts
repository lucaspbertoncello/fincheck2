import { describe, expect, it } from 'vitest';

import { translatePluggyInstallment } from '#/modules/sync/infra/pluggy/translate-pluggy-installment.util.ts';

describe('translatePluggyInstallment', () => {
  it('translates number, total, total amount and purchase day', () => {
    expect(
      translatePluggyInstallment({
        installmentNumber: 2,
        totalInstallments: 10,
        totalAmount: 1234.56,
        purchaseDate: '2026-09-15T00:00:00.000Z',
      }),
    ).toEqual({ number: 2, total: 10, totalCents: 123456, purchaseOn: '2026-09-15' });
  });

  // `totalAmount` is in the currency of the transaction: when that is not reais, there is no total
  // in reais to trust, and the plan takes the sum of the parcels.
  it('has no total amount when the purchase was in another currency', () => {
    expect(
      translatePluggyInstallment(
        { installmentNumber: 2, totalInstallments: 10, totalAmount: 500 },
        { foreignCurrency: true },
      ),
    ).toMatchObject({ number: 2, total: 10, totalCents: null });
  });

  it('turns the purchase instant into the business day', () => {
    expect(
      translatePluggyInstallment({
        installmentNumber: 1,
        totalInstallments: 3,
        purchaseDate: '2026-10-01T02:30:00.000Z',
      })?.purchaseOn,
    ).toBe('2026-09-30');
  });

  it('keeps total amount and purchase day null when the bank does not send them', () => {
    expect(translatePluggyInstallment({ installmentNumber: 3, totalInstallments: 3 })).toEqual({
      number: 3,
      total: 3,
      totalCents: null,
      purchaseOn: null,
    });
  });

  it.each([
    ['a single payment', { installmentNumber: 1, totalInstallments: 1 }],
    ['no total', { installmentNumber: 1 }],
    ['no number', { totalInstallments: 3 }],
    ['number zero', { installmentNumber: 0, totalInstallments: 3 }],
    ['number above the total', { installmentNumber: 4, totalInstallments: 3 }],
    ['not an integer', { installmentNumber: 1.5, totalInstallments: 3 }],
    ['nulls', { installmentNumber: null, totalInstallments: null }],
    ['no metadata', null],
    ['undefined', undefined],
  ])('is null for %s', (_name, metadata) => {
    expect(translatePluggyInstallment(metadata)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const CARD: Transaction.AccountRef = { id: 'card-1', isCard: true, isArchived: false };
const FOOD: Transaction.CategoryRef = { id: 'food', kind: 'expense', isArchived: false };

function plan(overrides: Partial<InstallmentPlan.CreateManualInput> = {}) {
  return InstallmentPlan.createManual(
    {
      account: CARD,
      description: 'Cadeira ergonômica',
      total: Money.fromCents(129900),
      installmentCount: 12,
      firstInvoiceMonth: Month.of('2026-11'),
      purchaseOn: BusinessDate.of('2026-10-31'),
      category: null,
      tags: [],
      ...overrides,
    },
    NOW,
  );
}

describe('InstallmentPlan.createManual', () => {
  it('is a manual plan on a card', () => {
    expect(plan()).toMatchObject({
      accountId: 'card-1',
      origin: 'manual',
      installmentCount: 12,
      categoryId: null,
      createdAt: NOW,
    });
  });

  it('only exists on a card and not on an archived one', () => {
    expect(() => plan({ account: { ...CARD, isCard: false } })).toThrow(
      expect.objectContaining({ code: 'INSTALLMENT_ACCOUNT_NOT_CARD' }),
    );
    expect(() => plan({ account: { ...CARD, isArchived: true } })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_ACCOUNT_ARCHIVED' }),
    );
  });

  it('takes an active category of expense, and active tags', () => {
    expect(plan({ category: FOOD }).categoryId).toBe('food');
    expect(() => plan({ category: { ...FOOD, kind: 'income' } })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() => plan({ category: { ...FOOD, isArchived: true } })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }),
    );
    expect(() =>
      plan({ category: FOOD, tags: [{ id: 'old', categoryId: 'food', isArchived: true }] }),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_TAG_ARCHIVED' }));
  });

  it('only takes tags of the category of the plan, and none with no category', () => {
    const other = { id: 'm', categoryId: 'market', isArchived: false };

    expect(() => plan({ category: FOOD, tags: [other] })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }),
    );
    expect(() => plan({ tags: [other] })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
  });

  it('wants 2 to 48 parcels and at least one cent each', () => {
    expect(() => plan({ installmentCount: 1 })).toThrow(RangeError);
    expect(() => plan({ installmentCount: 49 })).toThrow(RangeError);
    expect(() => plan({ total: Money.fromCents(0) })).toThrow(RangeError);
    expect(() => plan({ total: Money.fromCents(11), installmentCount: 12 })).toThrow(
      RequestValidationError,
    );
    expect(() => plan({ total: Money.fromCents(12), installmentCount: 12 })).not.toThrow();
  });
});

describe('InstallmentPlan.amounts (parcelas somam o total)', () => {
  it('splits R$ 1.299,00 in 12 into 12 x R$ 108,25', () => {
    expect(
      plan()
        .amounts()
        .map((amount) => amount.cents),
    ).toEqual(Array(12).fill(10825));
  });

  it('gives the leftover cents to the first parcel', () => {
    const amounts = plan({ total: Money.fromCents(10000), installmentCount: 3 }).amounts();

    expect(amounts.map((amount) => amount.cents)).toEqual([3334, 3333, 3333]);
  });

  it('always adds up to the total, for any total and any number of parcels', () => {
    for (let count = 2; count <= 48; count++) {
      for (const total of [count, count + 1, 99, 100, 129900, 100000001, 7 * count + 6]) {
        if (total < count) continue;
        const amounts = plan({
          total: Money.fromCents(total),
          installmentCount: count,
        }).amounts();

        expect(amounts).toHaveLength(count);
        expect(amounts.reduce((sum, amount) => sum + amount.cents, 0)).toBe(total);
        const [first, ...rest] = amounts;
        // The first takes the leftover: the others are equal and the first is never smaller.
        expect(rest.every((amount) => amount.cents === rest[0]?.cents)).toBe(true);
        expect((first?.cents ?? 0) - (rest[0]?.cents ?? 0)).toBeGreaterThanOrEqual(0);
        expect(amounts.every((amount) => amount.cents > 0)).toBe(true);
      }
    }
  });
});

describe('InstallmentPlan.buildParcels', () => {
  it('builds one card expense per parcel, parcel k on the invoice of the first plus k - 1', () => {
    const base = plan({
      total: Money.fromCents(30000),
      installmentCount: 3,
      firstInvoiceMonth: Month.of('2026-11'),
    });
    const built = base.buildParcels(
      { category: FOOD, tags: [{ id: 'a', categoryId: 'food', isArchived: false }] },
      NOW,
    );

    expect(built.map((parcel) => parcel.installment)).toEqual([
      { planId: base.id, number: 1 },
      { planId: base.id, number: 2 },
      { planId: base.id, number: 3 },
    ]);
    expect(built.map((parcel) => parcel.invoiceMonth?.value)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(built.every((parcel) => parcel.amount.cents === -10000)).toBe(true);
    for (const parcel of built) {
      expect(parcel).toMatchObject({
        accountId: 'card-1',
        origin: 'manual',
        nature: 'expense',
        natureSetBy: 'user',
        method: 'credit',
        description: 'Cadeira ergonômica',
        categoryId: 'food',
        categorySource: 'user',
        tagIds: ['a'],
      });
    }
  });

  it('dates each parcel on the day of the purchase in its month, held at the end of the month', () => {
    const built = plan({
      total: Money.fromCents(40000),
      installmentCount: 4,
      firstInvoiceMonth: Month.of('2027-01'),
      purchaseOn: BusinessDate.of('2026-12-31'),
    }).buildParcels({ category: null, tags: [] }, NOW);

    expect(built.map((parcel) => parcel.occurredOn.value)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
  });

  it('adds up to the total and counts each parcel in the month of its invoice', () => {
    const base = plan({ total: Money.fromCents(100000), installmentCount: 7 });
    const built = base.buildParcels({ category: null, tags: [] }, NOW);

    expect(built.reduce((sum, parcel) => sum + parcel.amount.cents, 0)).toBe(-100000);
    for (const parcel of built) {
      expect(parcel.competenceOn(base.purchaseOn).value.slice(0, 7)).toBe(
        parcel.invoiceMonth?.value,
      );
    }
  });

  it('is deleted only when it was entered by hand', () => {
    expect(() => plan().assertDeletable()).not.toThrow();
    expect(() =>
      new InstallmentPlan({
        accountId: 'card-1',
        origin: 'bank',
        description: 'x',
        purchaseOn: BusinessDate.of('2026-10-31'),
        total: Money.fromCents(1000),
        installmentCount: 2,
        firstInvoiceMonth: Month.of('2026-11'),
        categoryId: null,
        createdAt: NOW,
      }).assertDeletable(),
    ).toThrow(expect.objectContaining({ code: 'INSTALLMENT_PLAN_NOT_MANUAL' }));
  });
});

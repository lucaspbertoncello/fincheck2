import { describe, expect, it } from 'vitest';

import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-09T15:00:00.000Z';

const fromBank = (overrides: Partial<InstallmentPlan.CreateFromBankInput> = {}) =>
  InstallmentPlan.createFromBank(
    {
      accountId: 'card-1',
      description: 'AMAZON',
      purchaseOn: BusinessDate.of('2026-09-20'),
      total: Money.fromCents(129900),
      installmentCount: 12,
      firstInvoiceMonth: Month.of('2026-10'),
      ...overrides,
    },
    NOW,
  );

describe('InstallmentPlan.createFromBank', () => {
  it('is a plan of the bank, with no category, and its parcels add up to the total', () => {
    const plan = fromBank();

    expect(plan).toMatchObject({ origin: 'bank', categoryId: null, createdAt: NOW });
    expect(plan.amounts().reduce((sum, amount) => sum + amount.cents, 0)).toBe(129900);
    // R$ 1.299,00 in 12: the leftover cents go to the first parcel.
    expect(plan.amounts()[0]?.cents).toBe(10825);
  });

  it('a plan of the bank is not one Lucas may delete', () => {
    expect(() => fromBank().assertDeletable()).toThrow();
  });

  it.each([1, 49, 2.5])('refuses %s installments', (installmentCount) => {
    expect(() => fromBank({ installmentCount })).toThrow(RangeError);
  });

  it('accepts the limits 2 and 48', () => {
    expect(() => fromBank({ installmentCount: 2, total: Money.fromCents(100) })).not.toThrow();
    expect(() => fromBank({ installmentCount: 48, total: Money.fromCents(4800) })).not.toThrow();
  });

  it('needs a cent per parcel at least', () => {
    expect(() => fromBank({ installmentCount: 12, total: Money.fromCents(11) })).toThrow(
      RangeError,
    );
  });

  it('the invoice of each parcel is the first one plus its number minus one', () => {
    const plan = fromBank({ firstInvoiceMonth: Month.of('2026-11') });

    expect(plan.invoiceMonthOf(1).value).toBe('2026-11');
    expect(plan.invoiceMonthOf(3).value).toBe('2027-01');
  });
});

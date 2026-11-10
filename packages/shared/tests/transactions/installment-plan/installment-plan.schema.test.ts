import { describe, expect, it } from 'vitest';

import { INSTALLMENT_LIMITS } from '#/transactions/installment-plan/installment-plan.constant.ts';
import {
  createInstallmentPlanRequestSchema,
  updateInstallmentPlanRequestSchema,
} from '#/transactions/installment-plan/installment-plan.schema.ts';

const valid = {
  accountId: '0194f3a0-0000-7000-8000-000000000001',
  description: 'Cadeira ergonômica',
  totalCents: 129900,
  installmentCount: 12,
  firstInvoiceMonth: '2026-11',
  purchaseOn: '2026-10-22',
};

describe('createInstallmentPlanRequestSchema', () => {
  it('accepts a valid plan', () => {
    expect(createInstallmentPlanRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('keeps the installment count between the limits', () => {
    expect(INSTALLMENT_LIMITS).toEqual({ min: 2, max: 48 });
    expect(
      createInstallmentPlanRequestSchema.safeParse({ ...valid, installmentCount: 1 }).success,
    ).toBe(false);
    expect(
      createInstallmentPlanRequestSchema.safeParse({ ...valid, installmentCount: 49 }).success,
    ).toBe(false);
  });

  it('wants a positive total and real month and date', () => {
    expect(createInstallmentPlanRequestSchema.safeParse({ ...valid, totalCents: 0 }).success).toBe(
      false,
    );
    expect(
      createInstallmentPlanRequestSchema.safeParse({ ...valid, firstInvoiceMonth: '2026-13' })
        .success,
    ).toBe(false);
    expect(
      createInstallmentPlanRequestSchema.safeParse({ ...valid, purchaseOn: '2026-10-32' }).success,
    ).toBe(false);
  });
});

describe('updateInstallmentPlanRequestSchema', () => {
  const tag = '0194f3a0-0000-7000-8000-000000000002';

  it('accepts each field alone', () => {
    for (const body of [
      { description: '  Geladeira  ' },
      { totalCents: 100 },
      { installmentCount: 2 },
      { firstInvoiceMonth: '2027-01' },
      { categoryId: valid.accountId },
      { categoryId: null },
      { tagIds: [] },
      { tagIds: [tag] },
    ]) {
      expect(updateInstallmentPlanRequestSchema.safeParse(body).success).toBe(true);
    }
  });

  it('trims the description', () => {
    expect(updateInstallmentPlanRequestSchema.parse({ description: '  Geladeira  ' })).toEqual({
      description: 'Geladeira',
    });
  });

  it('wants at least one field', () => {
    expect(updateInstallmentPlanRequestSchema.safeParse({}).success).toBe(false);
    expect(updateInstallmentPlanRequestSchema.safeParse({ description: undefined }).success).toBe(
      false,
    );
  });

  it('refuses a field the plan does not take', () => {
    expect(
      updateInstallmentPlanRequestSchema.safeParse({ description: 'x', purchaseOn: '2026-10-22' })
        .success,
    ).toBe(false);
    expect(
      updateInstallmentPlanRequestSchema.safeParse({ description: 'x', accountId: valid.accountId })
        .success,
    ).toBe(false);
  });

  it('keeps the limits of the creation', () => {
    for (const body of [
      { description: '   ' },
      { description: 'x'.repeat(201) },
      { totalCents: 0 },
      { totalCents: 10.5 },
      { installmentCount: 1 },
      { installmentCount: 49 },
      { firstInvoiceMonth: '2026-13' },
      { categoryId: 'not-an-id' },
      { tagIds: Array.from({ length: 21 }, () => tag) },
    ]) {
      expect(updateInstallmentPlanRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});

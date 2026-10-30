import { describe, expect, it } from 'vitest';

import { INSTALLMENT_LIMITS } from '#/transactions/installment-plan/installment-plan.constant.ts';
import { createInstallmentPlanRequestSchema } from '#/transactions/installment-plan/installment-plan.schema.ts';

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

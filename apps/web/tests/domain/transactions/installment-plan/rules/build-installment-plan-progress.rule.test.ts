import { describe, expect, it } from 'vitest';

import { buildInstallmentPlanProgress } from '#/domain/transactions/installment-plan/rules/build-installment-plan-progress.rule.ts';

describe('buildInstallmentPlanProgress', () => {
  it('takes the next installment as the current one', () => {
    const progress = buildInstallmentPlanProgress({
      installmentCount: 10,
      nextInstallment: { number: 3, invoiceMonth: '2026-11', amountCents: 34_900 },
      remainingCents: 8 * 34_900,
    });

    expect(progress).toEqual({
      isSettled: false,
      currentNumber: 3,
      partLabel: 'Parcela 3 de 10',
    });
  });

  it('is settled with no installment left to charge', () => {
    const progress = buildInstallmentPlanProgress({
      installmentCount: 4,
      nextInstallment: null,
      remainingCents: 0,
    });

    expect(progress).toEqual({
      isSettled: true,
      currentNumber: null,
      partLabel: 'Quitada',
    });
  });

  it('is settled when nothing is left to pay even with a next installment', () => {
    expect(
      buildInstallmentPlanProgress({
        installmentCount: 4,
        nextInstallment: { number: 4, invoiceMonth: '2026-11', amountCents: 100 },
        remainingCents: 0,
      }).isSettled,
    ).toBe(true);
  });
});

import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import { describe, expect, it } from 'vitest';

import { buildInstallmentPlanRow } from '#/features/transactions/installment-plans/utils/build-installment-plan-row.util.ts';

const PLAN: InstallmentPlan.Dto = {
  id: '11111111-1111-4111-8111-111111111111',
  accountId: '22222222-2222-4222-8222-222222222222',
  origin: 'manual',
  description: 'Tênis',
  purchaseOn: '2026-05-12',
  totalCents: 40_000,
  installmentCount: 4,
  firstInvoiceMonth: '2026-05',
  categoryId: null,
  installments: [2, 1, 3, 4].map((number) => ({
    transactionId: `33333333-3333-4333-8333-33333333333${number}`,
    number,
    amountCents: 10_000,
    invoiceMonth: `2026-0${4 + number}`,
    occurredOn: `2026-0${4 + number}-12`,
  })),
  nextInstallment: { number: 2, invoiceMonth: '2026-06', amountCents: 10_000 },
  remainingCents: 30_000,
};

describe('buildInstallmentPlanRow', () => {
  it('says the current installment and the first invoice, and orders the installments', () => {
    const row = buildInstallmentPlanRow(PLAN, []);

    expect(row.detail).toBe('Parcela 2 de 4 · primeira fatura mai/26');
    expect(row.isSettled).toBe(false);
    expect(row.uncategorized).toBe(true);
    expect(row.installments.map((item) => item.number)).toEqual([1, 2, 3, 4]);
    expect(row.installments.filter((item) => item.isNext).map((item) => item.number)).toEqual([2]);
    expect(row.installments[0]).toMatchObject({
      dateLabel: '12/05',
      label: '1/4 · fatura de mai/26',
    });
  });

  it('writes "Quitada" for a plan with nothing left and flags the one from the bank', () => {
    const row = buildInstallmentPlanRow(
      { ...PLAN, origin: 'bank', nextInstallment: null, remainingCents: 0 },
      [],
    );

    expect(row.detail).toBe('Quitada · 4 parcelas · primeira fatura mai/26');
    expect(row.isSettled).toBe(true);
    expect(row.isFromBank).toBe(true);
  });
});

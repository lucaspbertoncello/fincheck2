import { describe, expect, it } from 'vitest';

import { describeInstallmentPlansSummary } from '#/features/transactions/installment-plans/utils/describe-installment-plans-summary.util.ts';

describe('describeInstallmentPlansSummary', () => {
  it('counts what is in progress and what is settled', () => {
    expect(describeInstallmentPlansSummary(0, 0)).toBe('Nenhuma compra parcelada ainda');
    expect(describeInstallmentPlansSummary(2, 1)).toBe('2 em andamento · 1 quitada');
    expect(describeInstallmentPlansSummary(0, 3)).toBe('3 quitadas');
  });
});

import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { describe, expect, it } from 'vitest';

import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function notebook() {
  const plans = listResponseSchema(installmentPlanDtoSchema).parse(
    (await callApi('GET', '/installment-plans')).json,
  ).items;
  const plan = plans.find((item) => item.description === 'Notebook Aero 14');
  if (!plan) throw new Error('seed without the notebook plan');

  return plan;
}

describe('installment plan: an installment that is not charged (mock vs api 56)', () => {
  it('leaves an ignored installment out of the next one and of what is left to pay', async () => {
    const before = await notebook();
    const next = before.installments.find((item) => item.number === before.nextInstallment?.number);
    expect(next).toBeDefined();

    await callApi('POST', `/transactions/${next?.transactionId}/ignore`);
    const after = await notebook();

    expect(after.installments).toHaveLength(before.installments.length);
    expect(after.nextInstallment?.number).toBe((before.nextInstallment?.number ?? 0) + 1);
    expect(after.remainingCents).toBe(before.remainingCents - (next?.amountCents ?? 0));
  });
});

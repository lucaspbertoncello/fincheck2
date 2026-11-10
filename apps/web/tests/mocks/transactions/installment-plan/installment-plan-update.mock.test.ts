import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function findPlan(origin: 'bank' | 'manual') {
  const plans = listResponseSchema(installmentPlanDtoSchema).parse(
    (await callApi('GET', '/installment-plans')).json,
  ).items;
  const plan = plans.find((item) => item.origin === origin);
  if (!plan) throw new Error(`seed without a ${origin} plan`);

  return plan;
}

function patch(id: string, body: unknown) {
  return callApi('PATCH', `/installment-plans/${id}`, body);
}

describe('PATCH /installment-plans/:id (mock vs api)', () => {
  it('recalculates the installments in place: same ids, the sum is the new total', async () => {
    const before = await findPlan('manual');

    const answer = await patch(before.id, { totalCents: 100_000 });
    const after = installmentPlanDtoSchema.parse(answer.json);

    expect(answer.status).toBe(200);
    expect(after.installments.map((item) => item.transactionId)).toEqual(
      before.installments.map((item) => item.transactionId),
    );
    expect(after.installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(100_000);
    expect(after.totalCents).toBe(100_000);
  });

  it('puts the leftover cents on the first installment', async () => {
    const before = await findPlan('manual');

    const after = installmentPlanDtoSchema.parse(
      (await patch(before.id, { totalCents: 10_001, installmentCount: 3 })).json,
    );

    expect(after.installments.map((item) => item.amountCents)).toEqual([3335, 3333, 3333]);
  });

  it('grows the count keeping the first ids and shrinks it cutting the last ones', async () => {
    const before = await findPlan('manual');

    const grown = installmentPlanDtoSchema.parse(
      (await patch(before.id, { installmentCount: before.installmentCount + 2 })).json,
    );
    expect(grown.installments).toHaveLength(before.installmentCount + 2);
    expect(
      grown.installments.slice(0, before.installmentCount).map((item) => item.transactionId),
    ).toEqual(before.installments.map((item) => item.transactionId));
    expect(grown.installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(
      before.totalCents,
    );

    const shrunk = installmentPlanDtoSchema.parse(
      (await patch(before.id, { installmentCount: 2 })).json,
    );
    expect(shrunk.installments.map((item) => item.number)).toEqual([1, 2]);
    expect(shrunk.installments.map((item) => item.transactionId)).toEqual(
      before.installments.slice(0, 2).map((item) => item.transactionId),
    );
  });

  it('moves the invoices with firstInvoiceMonth and takes the category off with null', async () => {
    const before = await findPlan('manual');

    const moved = installmentPlanDtoSchema.parse(
      (await patch(before.id, { firstInvoiceMonth: '2027-01', categoryId: null })).json,
    );

    expect(moved.firstInvoiceMonth).toBe('2027-01');
    expect(moved.installments[0]?.invoiceMonth).toBe('2027-01');
    expect(moved.installments[1]?.invoiceMonth).toBe('2027-02');
    expect(moved.categoryId).toBeNull();
  });

  it('refuses a plan of the bank, an unknown plan and an empty body', async () => {
    const bank = await findPlan('bank');
    const manual = await findPlan('manual');

    const notManual = await patch(bank.id, { description: 'Outro nome' });
    expect(notManual.status).toBe(422);
    expect(notManual.json).toMatchObject({ code: 'INSTALLMENT_PLAN_NOT_MANUAL' });

    const missing = await patch('11111111-1111-4111-8111-111111111111', { description: 'X' });
    expect(missing.status).toBe(404);
    expect((await patch(manual.id, {})).status).toBe(400);
  });

  it('refuses a change that moves money on an invoice with a payment, with the month in details', async () => {
    const plan = await findPlan('manual');
    const parcel = plan.installments[1];
    db.invoices.push({
      accountId: plan.accountId,
      month: parcel?.invoiceMonth ?? '',
      closesOn: '2026-01-01',
      dueOn: '2026-01-08',
      bankTotalCents: null,
      totalOverrideCents: null,
      overrideNote: null,
      payments: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          amountCents: 100,
          paidOn: '2026-01-02',
          transactionId: null,
          presumed: false,
        } as never,
      ],
      dismissedTransactionIds: [],
    });

    const answer = await patch(plan.id, { totalCents: plan.totalCents + 400 });

    expect(answer.status).toBe(422);
    expect(answer.json).toMatchObject({
      code: 'INSTALLMENT_INVOICE_PAID',
      details: { invoiceMonth: parcel?.invoiceMonth },
    });
    // Only the description changes no money: it passes.
    expect((await patch(plan.id, { description: 'Outro nome' })).status).toBe(200);
  });

  it('refuses a change of value while a parcel is split, with its number in details', async () => {
    const plan = await findPlan('manual');
    const tx = db.transactions.find((item) => item.id === plan.installments[2]?.transactionId);
    if (!tx) throw new Error('parcel not found');
    tx.splits = [{ id: 'x' } as never];

    const answer = await patch(plan.id, { totalCents: plan.totalCents + 400 });

    expect(answer.status).toBe(422);
    expect(answer.json).toMatchObject({ code: 'INSTALLMENT_PARCEL_SPLIT', details: { number: 3 } });
  });

  it('refuses an archived card', async () => {
    const plan = await findPlan('manual');
    const card = db.accounts.find((item) => item.id === plan.accountId);
    if (card) card.archivedAt = '2026-01-01T00:00:00.000Z';

    const answer = await patch(plan.id, { description: 'Outro nome' });

    expect(answer.json).toMatchObject({ code: 'TRANSACTION_ACCOUNT_ARCHIVED' });
  });
});

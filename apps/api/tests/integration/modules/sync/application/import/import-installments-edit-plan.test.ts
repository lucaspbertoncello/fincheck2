import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankCard,
  buildTestBankTransaction,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const CARD = 'pluggy-account-card';

// A plan entered by hand that the bank already took parcels of: the parcel of the bank replaces the
// manual one inside the plan, which stays `manual`. The bank is the truth of that parcel, so the
// edit of the plan never changes its value, date or invoice, never removes it, and the next round
// does not count the purchase twice.
describe('editing a manual plan the bank already sent parcels of', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;
  let cardId: string;
  let planId: string;
  let connectionId: string;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
    const connection = await world.connect();
    connectionId = connection.id;
    cardId = await world.accountIdOf(CARD);

    const created = await world.send('POST', '/installment-plans', {
      accountId: cardId,
      description: 'Notebook',
      totalCents: 129900,
      installmentCount: 12,
      firstInvoiceMonth: '2026-10',
      purchaseOn: '2026-09-18',
    });
    expect(created.status).toBe(201);
    planId = ((await created.json()) as { id: string }).id;

    world.provider.transactions.set(CARD, [bankParcel(2), bankParcel(11)]);
    world.moveTo('2026-11-09T18:00:00.000Z');
    await world.retry(connectionId);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const bankParcel = (number: number) =>
    buildTestBankTransaction({
      id: `dell-${String(number)}`,
      description: `DELL ${String(number).padStart(2, '0')}/12`,
      amountCents: -10825,
      occurredOn: '2026-11-01',
      method: 'credit',
      installment: { number, total: 12, totalCents: 129900, purchaseOn: '2026-09-18' },
    });

  const patch = (body: unknown) => world.send('PATCH', `/installment-plans/${planId}`, body);

  const expectFromBank = async (response: Response, number: number) => {
    expect(response.status).toBe(422);
    const error = apiErrorSchema.parse(await response.json());
    expect(error.code).toBe('INSTALLMENT_PARCEL_FROM_BANK');
    expect(error.details).toMatchObject({ number });
  };

  const state = async () => {
    const plans = await world.database.db
      .selectFrom('installment_plans')
      .select(['id', 'origin', 'installment_count', 'total_cents', 'description'])
      .orderBy('id')
      .execute();
    const rows = await world.database.db
      .selectFrom('transactions')
      .selectAll()
      .where('account_id', '=', cardId)
      .orderBy('installment_plan_id')
      .orderBy('installment_number')
      .execute();

    return {
      plans,
      rows: rows.map((row) => ({
        plan: row.installment_plan_id,
        number: row.installment_number,
        origin: row.origin,
        amount: row.amount_cents,
        bankAmount: row.bank_amount_cents,
        month: row.invoice_month,
        on: row.occurred_on,
        description: row.description,
      })),
    };
  };

  it('starts with the plan manual and the parcels 2 and 11 from the bank', async () => {
    const { plans, rows } = await state();

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ origin: 'manual', installment_count: 12 });
    expect(rows.filter((row) => row.origin === 'bank').map((row) => row.number)).toEqual([2, 11]);
    expect(rows).toHaveLength(12);
  });

  it('refuses to lower the count below a parcel of the bank, writing nothing, and the next round does not duplicate the purchase', async () => {
    const before = await state();

    // The new share of 6 parcels is not what the bank charged on the parcel 2.
    await expectFromBank(await patch({ installmentCount: 6 }), 2);
    // Even with a total that keeps the share of the bank (6 x R$ 108,25), the parcel 11 would go.
    await expectFromBank(await patch({ installmentCount: 6, totalCents: 64950 }), 11);
    expect(await state()).toEqual(before);

    world.moveTo('2026-11-10T18:00:00.000Z');
    await world.retry(connectionId);
    expect(await state()).toEqual(before);
  });

  it('refuses a total that changes the share of a parcel of the bank, writing nothing', async () => {
    const before = await state();

    await expectFromBank(await patch({ totalCents: 140000 }), 2);
    await expectFromBank(await patch({ totalCents: 140000, installmentCount: 12 }), 2);
    expect(await state()).toEqual(before);
  });

  it('refuses to move the first invoice, because the parcels of the bank would move with it', async () => {
    const before = await state();

    await expectFromBank(await patch({ firstInvoiceMonth: '2027-01' }), 2);
    expect(await state()).toEqual(before);
  });

  it('lets the description, the category and the tags go to the parcel of the bank, and keeps its value, date and invoice', async () => {
    const before = await state();

    const response = await patch({ description: 'Notebook novo' });

    expect(response.status).toBe(200);
    const after = await state();
    expect(after.rows.map((row) => [row.number, row.amount, row.month, row.on])).toEqual(
      before.rows.map((row) => [row.number, row.amount, row.month, row.on]),
    );
    expect(after.rows.every((row) => row.description === 'Notebook novo')).toBe(true);
    expect(after.rows.filter((row) => row.origin === 'bank').map((row) => row.amount)).toEqual([
      -10825, -10825,
    ]);

    world.moveTo('2026-11-10T18:00:00.000Z');
    await world.retry(connectionId);
    const again = await state();
    expect(again.plans).toHaveLength(1);
    expect(again.rows).toHaveLength(12);
    expect(again.rows.map((row) => [row.number, row.amount, row.month, row.on])).toEqual(
      before.rows.map((row) => [row.number, row.amount, row.month, row.on]),
    );
  });

  it('sending the same total and count again does not refuse and leaves the parcels of the bank alone', async () => {
    const before = await state();

    const response = await patch({ totalCents: 129900, installmentCount: 12 });

    expect(response.status).toBe(200);
    expect(await state()).toEqual(before);
  });
});

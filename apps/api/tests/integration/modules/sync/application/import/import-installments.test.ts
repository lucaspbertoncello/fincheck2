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

describe('installment purchases the bank sent', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
    // Closes on the 5th, due on the 12th.
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const parcel = (
    number: number,
    overrides: Partial<Parameters<typeof buildTestBankTransaction>[0]> = {},
  ) =>
    buildTestBankTransaction({
      id: `amazon-${String(number)}`,
      description: `AMAZON ${String(number).padStart(2, '0')}/12`,
      amountCents: -10825,
      occurredOn: '2026-09-20',
      method: 'credit',
      installment: { number, total: 12, totalCents: 129900, purchaseOn: '2026-09-20' },
      ...overrides,
    });
  const plans = () => world.database.db.selectFrom('installment_plans').selectAll().execute();
  const parcels = async () =>
    (await world.transactionsOf(await world.accountIdOf(CARD))).toSorted(
      (a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0),
    );

  it('creates the plan of the bank (card, purchase date, count, total) and puts the parcel on its invoice', async () => {
    world.provider.transactions.set(CARD, [parcel(3)]);

    await world.connect();

    const [plan] = await plans();
    expect(await plans()).toHaveLength(1);
    expect(plan).toMatchObject({
      origin: 'bank',
      purchase_on: '2026-09-20',
      total_cents: 129900,
      installment_count: 12,
      // Bought on 20/09, after the closing of the 5th: the first parcel is on the invoice of October.
      first_invoice_month: '2026-10',
      category_id: null,
    });
    const received = (await parcels()).find((row) => row.installment_number === 3);
    expect(received).toMatchObject({
      origin: 'bank',
      installment_plan_id: plan?.id,
      invoice_month: '2026-12',
      amount_cents: -10825,
      occurred_on: '2026-09-20',
    });
  });

  it('generates the parcels the bank has not sent yet, for the invoices of the next months, and they add up with the plan', async () => {
    world.provider.transactions.set(CARD, [parcel(3)]);

    await world.connect();

    const rows = await parcels();
    expect(rows.map((row) => row.installment_number)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const generated = rows.filter((row) => row.installment_number !== 3);
    expect(generated.every((row) => row.origin === 'manual' && row.amount_cents === -10825)).toBe(
      true,
    );
    expect(generated.map((row) => row.invoice_month)).toEqual([
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
    ]);
  });

  it('the parcels of a total that does not divide put the leftover cents on the first one', async () => {
    world.provider.transactions.set(CARD, [
      parcel(1, {
        amountCents: -10825,
        installment: { number: 1, total: 12, totalCents: 129902, purchaseOn: '2026-09-20' },
      }),
    ]);

    await world.connect();

    // R$ 1.299,02 in 12: the first parcel has R$ 108,27 and the others R$ 108,25.
    const rows = await parcels();
    expect(rows.slice(1).every((row) => row.amount_cents === -10825)).toBe(true);
    expect(
      rows.reduce(
        (sum, row) => sum + (row.installment_number === 1 ? -10827 : row.amount_cents),
        0,
      ),
    ).toBe(-129902);
  });

  it('the parcel that arrives later takes the place of the generated one, and what Lucas chose on it goes to the new one', async () => {
    world.provider.transactions.set(CARD, [parcel(3)]);
    const connection = await world.connect();
    const generated = (await parcels()).find((row) => row.installment_number === 4);
    const categoryId = await world.categoryIdOf('expense');
    await world.send('PATCH', `/transactions/${generated?.id ?? ''}`, { categoryId });
    world.provider.transactions.set(CARD, [
      parcel(3),
      parcel(4, { occurredOn: '2026-10-20', amountCents: -10826 }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    const rows = await parcels();
    expect(rows.map((row) => row.installment_number)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const fourth = rows.find((row) => row.installment_number === 4);
    expect(fourth).toMatchObject({
      origin: 'bank',
      amount_cents: -10826,
      category_id: categoryId,
      category_source: 'user',
    });
    expect(fourth?.id).not.toBe(generated?.id);
    expect(await plans()).toHaveLength(1);
  });

  it('two parcels of the same purchase in the same round share one plan', async () => {
    world.provider.transactions.set(CARD, [parcel(1), parcel(2)]);

    await world.connect();

    expect(await plans()).toHaveLength(1);
    const rows = (await parcels()).filter((row) => row.origin === 'bank');
    expect(rows.map((row) => row.installment_number)).toEqual([1, 2]);
  });

  it('a different purchase on another day is another plan', async () => {
    world.provider.transactions.set(CARD, [
      parcel(1),
      parcel(1, {
        id: 'other',
        occurredOn: '2026-09-25',
        installment: { number: 1, total: 12, totalCents: 129900, purchaseOn: '2026-09-25' },
      }),
    ]);

    await world.connect();

    expect(await plans()).toHaveLength(2);
  });

  it('the same round again changes nothing: no plan, no parcel, no link is added (idempotency)', async () => {
    world.provider.transactions.set(CARD, [parcel(3)]);
    const connection = await world.connect();
    const before = await parcels();
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    expect(await parcels()).toEqual(before);
    expect(await plans()).toHaveLength(1);
  });

  it('a purchase the bank sends with no purchase date works out the plan from the date of the parcel', async () => {
    world.provider.transactions.set(CARD, [
      parcel(3, {
        occurredOn: '2026-11-02',
        installment: { number: 3, total: 12, totalCents: null, purchaseOn: null },
      }),
    ]);

    await world.connect();

    const [plan] = await plans();
    // Parcel 3 on the invoice of November: the first one was the invoice of September, bought in August.
    expect(plan).toMatchObject({
      purchase_on: '2026-09-02',
      first_invoice_month: '2026-09',
      total_cents: 129900,
    });
  });

  it('a plan that Lucas entered by hand for the same purchase takes the parcel of the bank in place of its own parcel', async () => {
    const connection = await world.connect();
    const cardId = await world.accountIdOf(CARD);
    const categoryId = await world.categoryIdOf('expense');
    const manual = await world.send('POST', '/installment-plans', {
      accountId: cardId,
      description: 'Notebook',
      totalCents: 129900,
      installmentCount: 12,
      firstInvoiceMonth: '2026-10',
      purchaseOn: '2026-09-18',
      categoryId,
    });
    expect(manual.status).toBe(201);
    world.provider.transactions.set(CARD, [
      parcel(2, { description: 'DELL 02/12', occurredOn: '2026-11-01' }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    // No second plan: the parcel went into the plan of Lucas, replacing his parcel 2.
    expect(await plans()).toHaveLength(1);
    const second = (await parcels()).filter((row) => row.installment_number === 2);
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      origin: 'bank',
      description: 'DELL 02/12',
      category_id: categoryId,
      installment_plan_id: (await plans())[0]?.id,
    });
  });

  it('a parcel that is not an installment of the product (1 of 1) is an ordinary purchase', async () => {
    world.provider.transactions.set(CARD, [
      buildTestBankTransaction({ id: 'one', method: 'credit', installment: null }),
    ]);

    await world.connect();

    expect(await plans()).toEqual([]);
  });
});

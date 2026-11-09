import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestBankCard,
  buildTestBankTransaction,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const CHECKING = 'pluggy-account-checking';
const CARD = 'pluggy-account-card';

// What the Pluggy can repeat: the same id twice in one answer (a page that moved between two calls)
// and two different purchases that look the same (two identical installment purchases). Neither may
// stop the connection or add a line to every round.
describe('repeated items in what the bank sent', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  describe('the same id of the Pluggy twice in one answer', () => {
    it('is one transaction in every round: no line is added to each round, and the spending counts once', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount()]);
      const once = buildTestBankTransaction({ id: 'same-id', description: 'Mercado' });
      world.provider.transactions.set(CHECKING, [once, once]);

      const connection = await world.connect();
      const accountId = await world.accountIdOf(CHECKING);
      expect(await world.transactionsOf(accountId)).toHaveLength(1);

      world.moveTo('2026-11-09T18:00:00.000Z');
      const second = await world.retry(connection.id);
      world.moveTo('2026-11-09T20:00:00.000Z');
      const third = await world.retry(connection.id);

      expect(second).toMatchObject({ status: 'success', createdCount: 0 });
      expect(third).toMatchObject({ status: 'success', createdCount: 0 });
      expect(await world.transactionsOf(accountId)).toHaveLength(1);
      const links = await world.database.db
        .selectFrom('sync_transaction_links')
        .selectAll()
        .execute();
      expect(links).toHaveLength(1);
    });
  });

  describe('two installment purchases that look the same (same card, day, total, value and parcel)', () => {
    const parcel = (id: string) =>
      buildTestBankTransaction({
        id,
        description: 'SHOPEE 01/03',
        amountCents: -3334,
        occurredOn: '2026-10-10',
        method: 'credit',
        installment: { number: 1, total: 3, totalCents: 10000, purchaseOn: '2026-10-10' },
      });
    const plans = () => world.database.db.selectFrom('installment_plans').selectAll().execute();
    const parcels = async () => world.transactionsOf(await world.accountIdOf(CARD));

    beforeEach(() => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
    });

    it('the round does not fail: each purchase is a plan of its own, with its parcel and the parcels to come', async () => {
      world.provider.transactions.set(CARD, [parcel('shopee-a'), parcel('shopee-b')]);

      const connection = await world.connect();

      expect(connection.lastRun).toMatchObject({ status: 'success', errorCode: null });
      expect(await plans()).toHaveLength(2);
      const rows = await parcels();
      // Two purchases of 3 parcels: 1 (the bank's) and 2 and 3 (generated) of each.
      expect(rows).toHaveLength(6);
      const byPlan = Map.groupBy(rows, (row) => row.installment_plan_id);
      expect(byPlan.size).toBe(2);
      for (const group of byPlan.values()) {
        expect(group.map((row) => row.installment_number).toSorted()).toEqual([1, 2, 3]);
      }
      const links = await world.database.db
        .selectFrom('sync_transaction_links')
        .selectAll()
        .execute();
      expect(links.map((link) => link.pluggy_transaction_id).toSorted()).toEqual([
        'shopee-a',
        'shopee-b',
      ]);
      expect(new Set(links.map((link) => link.transaction_id)).size).toBe(2);
    });

    it('the next round changes nothing and keeps each id on its own transaction', async () => {
      world.provider.transactions.set(CARD, [parcel('shopee-a'), parcel('shopee-b')]);
      const connection = await world.connect();
      const before = await world.database.db
        .selectFrom('sync_transaction_links')
        .select(['pluggy_transaction_id', 'transaction_id'])
        .orderBy('pluggy_transaction_id')
        .execute();

      world.moveTo('2026-11-09T18:00:00.000Z');
      const next = await world.retry(connection.id);

      expect(next).toMatchObject({
        status: 'success',
        createdCount: 0,
        updatedCount: 0,
        removedCount: 0,
      });
      expect(await parcels()).toHaveLength(6);
      expect(
        await world.database.db
          .selectFrom('sync_transaction_links')
          .select(['pluggy_transaction_id', 'transaction_id'])
          .orderBy('pluggy_transaction_id')
          .execute(),
      ).toEqual(before);
    });

    it('two identical parcels that arrive together for the place of a generated parcel: one takes it, the other is a purchase of its own (the plan already loaded does not offer the same place twice)', async () => {
      const second = (id: string) =>
        buildTestBankTransaction({
          ...parcel(id),
          description: 'SHOPEE 02/03',
          occurredOn: '2026-11-10',
          installment: { number: 2, total: 3, totalCents: 10000, purchaseOn: '2026-10-10' },
        });
      world.provider.transactions.set(CARD, [parcel('shopee-a')]);
      const connection = await world.connect();
      expect(await plans()).toHaveLength(1);

      world.provider.transactions.set(CARD, [
        parcel('shopee-a'),
        second('shopee-b'),
        second('shopee-c'),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');
      const next = await world.retry(connection.id);

      expect(next).toMatchObject({ status: 'success', createdCount: 2 });
      expect(await plans()).toHaveLength(2);
      const numbersByPlan = Map.groupBy(await parcels(), (row) => row.installment_plan_id);
      for (const group of numbersByPlan.values()) {
        const numbers = group.map((row) => row.installment_number);
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    });

    it('a purchase that arrives in a later round, looking like one already imported, is a purchase of its own', async () => {
      world.provider.transactions.set(CARD, [parcel('shopee-a')]);
      const connection = await world.connect();
      expect(await plans()).toHaveLength(1);

      world.provider.transactions.set(CARD, [parcel('shopee-a'), parcel('shopee-b')]);
      world.moveTo('2026-11-09T18:00:00.000Z');
      const next = await world.retry(connection.id);

      expect(next).toMatchObject({ status: 'success', createdCount: 1 });
      expect(await plans()).toHaveLength(2);
      const links = await world.database.db
        .selectFrom('sync_transaction_links')
        .selectAll()
        .execute();
      expect(new Set(links.map((link) => link.transaction_id)).size).toBe(2);
    });
  });
});

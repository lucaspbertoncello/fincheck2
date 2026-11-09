import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyTransactionLinkStore } from '#/modules/sync/infra/import/transaction-link.store.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const SEEN = '2026-11-09T15:00:00.000Z';

describe('KyselyTransactionLinkStore', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let store: KyselyTransactionLinkStore;
  let accountId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    store = new KyselyTransactionLinkStore(database.db);
    accountId = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const transaction = () => insertTestTransaction(database.db, accountId);

  it('puts a link and finds it by the id of the Pluggy and by the transaction', async () => {
    const transactionId = await transaction();

    await store.put({ pluggyId: 'p1', transactionId, providerRef: 'OF-1', lastSeenAt: SEEN });

    const link = { pluggyId: 'p1', transactionId, providerRef: 'OF-1', lastSeenAt: SEEN };
    expect((await store.findByPluggyIds(['p1', 'missing'])).get('p1')).toEqual(link);
    expect((await store.findByTransactionIds([transactionId])).get(transactionId)).toEqual(link);
    expect((await store.findByPluggyIds([])).size).toBe(0);
  });

  it('putting again for the same transaction moves the link to the new id of the Pluggy (one link per transaction)', async () => {
    const transactionId = await transaction();
    await store.put({ pluggyId: 'p1', transactionId, providerRef: null, lastSeenAt: SEEN });

    await store.put({ pluggyId: 'p2', transactionId, providerRef: 'OF-9', lastSeenAt: SEEN });

    const links = await database.db.selectFrom('sync_transaction_links').selectAll().execute();
    expect(links.map((link) => [link.pluggy_transaction_id, link.provider_ref])).toEqual([
      ['p2', 'OF-9'],
    ]);
  });

  it('putting an id of the Pluggy that another transaction had gives it to the new one', async () => {
    const first = await transaction();
    const second = await transaction();
    await store.put({ pluggyId: 'p1', transactionId: first, providerRef: null, lastSeenAt: SEEN });

    await store.put({ pluggyId: 'p1', transactionId: second, providerRef: null, lastSeenAt: SEEN });

    expect([...(await store.findByTransactionIds([first, second])).keys()]).toEqual([second]);
  });

  it('touch brings the last seen up to date, and only of the ids asked', async () => {
    const first = await transaction();
    const second = await transaction();
    await store.put({ pluggyId: 'p1', transactionId: first, providerRef: null, lastSeenAt: SEEN });
    await store.put({ pluggyId: 'p2', transactionId: second, providerRef: null, lastSeenAt: SEEN });

    await store.touch(['p1'], '2026-11-10T00:00:00.000Z');

    const found = await store.findByPluggyIds(['p1', 'p2']);
    expect(found.get('p1')?.lastSeenAt).toBe('2026-11-10T00:00:00.000Z');
    expect(found.get('p2')?.lastSeenAt).toBe(SEEN);
  });

  it('reads thousands of ids at once (a first round after a long history)', async () => {
    const transactionId = await transaction();
    await store.put({ pluggyId: 'p-1200', transactionId, providerRef: null, lastSeenAt: SEEN });
    const ids = Array.from({ length: 1500 }, (_unused, index) => `p-${String(index)}`);

    const found = await store.findByPluggyIds(ids);

    expect([...found.keys()]).toEqual(['p-1200']);
  });

  it('the link goes with the transaction', async () => {
    const transactionId = await transaction();
    await store.put({ pluggyId: 'p1', transactionId, providerRef: null, lastSeenAt: SEEN });

    await database.db.deleteFrom('transactions').where('id', '=', transactionId).execute();

    expect((await store.findByPluggyIds(['p1'])).size).toBe(0);
  });
});

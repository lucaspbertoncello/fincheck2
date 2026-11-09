import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApi } from '#/main/build-api.util.ts';
import { createApp } from '#/main/http/create-app.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestBankCard,
  buildTestBankTransaction,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';
import { FakeBankProvider } from '#tests/support/sync/provider/fake-bank-provider.service.ts';
import { FakeSecretCipher } from '#tests/support/sync/provider/fake-secret-cipher.service.ts';
import { TestBackgroundRunner } from '#tests/support/sync/run/test-background-runner.service.ts';

// The app `main` builds (`createApp`, `buildApi`), not the pieces of `sync` alone: each test needs
// one connection that `createApp` has to make between `sync` and the other contexts, and fails if it
// is left out (the report lists the ones taken out one at a time and how many tests fell).
describe('createApp wires sync to the other contexts', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const accountIdsOf = async () => (await world.accountsTable()).map((account) => account.id);

  it('mounts every route of the contract: none is ROUTE_NOT_FOUND (the 401 of a wrong token proves they are behind the local token too)', async () => {
    const id = '019a0000-0000-7000-8000-000000000000';
    const routes: [string, string][] = [
      ['GET', '/sync/settings'],
      ['PUT', '/sync/settings'],
      ['POST', '/sync/connect-token'],
      ['GET', '/sync/connections'],
      ['POST', '/sync/connections'],
      ['PUT', `/sync/connections/${id}/account-matches`],
      ['DELETE', `/sync/connections/${id}`],
      ['GET', `/sync/connections/${id}/runs`],
      ['POST', `/sync/connections/${id}/runs`],
    ];

    for (const [method, path] of routes) {
      const response = await world.send(method, path, undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' });
      expect(response.status, `${method} ${path}`).toBe(401);
    }
    for (const [method, path] of routes) {
      // A 404 of the domain (the connection does not exist) is a route that is mounted.
      const body = (await (await world.send(method, path)).json().catch(() => ({}))) as {
        code?: string;
      };
      expect(body.code, `${method} ${path}`).not.toBe('ROUTE_NOT_FOUND');
    }
  });

  it('accounts shows the connection of an account of the bank (the connection reader of the presenter)', async () => {
    const connection = await world.connect();
    const [accountId] = await accountIdsOf();

    const response = await world.send('GET', `/accounts/${accountId ?? ''}`);

    expect(((await response.json()) as { connection: unknown }).connection).toEqual({
      connectionId: connection.id,
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: '2026-11-09T13:00:00.000Z',
    });
  });

  it('accounts tells that an account of an active connection comes back in the next sync (the reader of the deletion impact)', async () => {
    await world.connect();
    const [accountId] = await accountIdsOf();

    const response = await world.send('GET', `/accounts/${accountId ?? ''}/deletion-impact`);

    expect(
      (await response.json()) as { isPluggy: boolean; returnsOnNextSync: boolean },
    ).toMatchObject({
      isPluggy: true,
      returnsOnNextSync: true,
    });
  });

  it('creates the accounts of the item (accounts: create)', async () => {
    await world.connect();

    expect(await world.accountsTable()).toHaveLength(1);
  });

  it('refreshes the balance of an account in the next round (accounts: refresh)', async () => {
    const connection = await world.connect();
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount({ balanceCents: 7 })]);
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    expect((await world.accountsTable())[0]?.bank_balance_cents).toBe(7);
  });

  it('puts a card purchase on its invoice (transactions: the invoice month of invoices)', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
    world.provider.transactions.set('pluggy-account-card', [
      buildTestBankTransaction({ occurredOn: '2026-11-06', method: 'credit' }),
    ]);

    await world.connect();

    const [account] = await world.accountsTable();
    expect((await world.transactionsOf(account?.id ?? ''))[0]?.invoice_month).toBe('2026-12');
  });

  it('writes the total of the bank on the invoice (invoices: the total of the bank)', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
    world.provider.invoices.set('pluggy-account-card', [
      { id: 'b1', dueOn: '2026-11-12', totalCents: 5000 },
    ]);

    await world.connect();

    const [account] = await world.accountsTable();
    const response = await world.send('GET', `/cards/${account?.id ?? ''}/invoices/2026-11`);
    expect(invoiceDtoSchema.parse(await response.json()).bankTotalCents).toBe(5000);
  });

  it('a debit that equals an invoice to pay is a payment (invoices: the invoices to pay)', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);
    world.provider.invoices.set('pluggy-account-card', [
      { id: 'b1', dueOn: '2026-10-12', totalCents: 15000 },
    ]);
    world.provider.transactions.set('pluggy-account-card', [
      buildTestBankTransaction({
        id: 'p',
        amountCents: -15000,
        occurredOn: '2026-09-20',
        method: 'credit',
      }),
    ]);
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({
        id: 'd',
        description: 'Fatura',
        amountCents: -15000,
        occurredOn: '2026-10-14',
      }),
    ]);

    await world.connect();

    const debit = (await world.database.db.selectFrom('transactions').selectAll().execute()).find(
      (row) => row.description === 'Fatura',
    );
    expect(debit?.nature).toBe('invoice_payment');
  });

  it('leaves alone a transaction that already pays something (the links of the owners)', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({
        id: 'd',
        description: 'Academia',
        amountCents: -30000,
        occurredOn: '2026-11-03',
      }),
    ]);
    const connection = await world.connect();
    const [debit] = await world.database.db.selectFrom('transactions').selectAll().execute();
    await world.send('POST', '/recurrences', {
      kind: 'expense',
      name: 'Academia',
      expectedAmountCents: 30000,
      dateRule: { type: 'fixed_day', day: 3 },
      startsMonth: '2026-11',
      linkTransactionId: debit?.id,
    });
    world.provider.transactions.set('pluggy-account-card', [
      buildTestBankTransaction({
        id: 'c',
        description: 'PAGAMENTO RECEBIDO',
        amountCents: 30000,
        occurredOn: '2026-11-03',
        method: 'credit',
      }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    const rows = await world.database.db.selectFrom('transactions').selectAll().execute();
    expect(rows.find((row) => row.description === 'Academia')?.nature).toBe('expense');
  });

  it('applies the rules of category to the new transactions (categories: the rules)', async () => {
    const categoryId = await world.categoryIdOf('expense');
    await world.send('POST', '/rules', { descriptionContains: 'MERCADO', categoryId });
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({ description: 'Mercado Central' }),
    ]);

    await world.connect();

    const [account] = await world.accountsTable();
    expect((await world.transactionsOf(account?.id ?? ''))[0]?.category_id).toBe(categoryId);
  });

  it('ties the new transaction to the occurrence it settles (recurrences: the automatic match)', async () => {
    await world.send('POST', '/recurrences', {
      kind: 'expense',
      name: 'Academia',
      expectedAmountCents: 10990,
      dateRule: { type: 'fixed_day', day: 10 },
      startsMonth: '2026-11',
    });
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({ amountCents: -10990, occurredOn: '2026-11-09' }),
    ]);

    await world.connect();

    const payments = await world.database.db
      .selectFrom('occurrence_payments')
      .selectAll()
      .execute();
    expect(payments).toHaveLength(1);
    expect(payments[0]?.linked_by).toBe('auto');
  });

  it('opens the manual balance at the last balance of the bank when it is disconnected (transactions: the balance and the adjustment)', async () => {
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({ amountCents: -20000 }),
    ]);
    const connection = await world.connect();

    await world.send('DELETE', `/sync/connections/${connection.id}`);

    const [account] = await world.accountsTable();
    const response = await world.send('GET', `/accounts/${account?.id ?? ''}`);
    expect(((await response.json()) as { balanceCents: number }).balanceCents).toBe(100000);
  });

  it('listing accounts shows the connection of each (the same reader, on the list)', async () => {
    const connection = await world.connect();

    const response = await world.send('GET', '/accounts');
    const body = (await response.json()) as {
      items: { connection: { connectionId: string } | null }[];
    };

    expect(body.items.map((item) => item.connection?.connectionId)).toEqual([connection.id]);
  });

  it('the first connection answers 202 and the round goes on through the runner it was given (the background runner)', async () => {
    await world.connect();

    expect(world.background.started).toBe(1);
  });

  it('asks the gate of the sync before a round (the pause gate)', async () => {
    const connection = await world.connect();
    world.gate.paused = true;
    world.provider.calls.length = 0;

    const response = await world.send('POST', `/sync/connections/${connection.id}/runs`);

    expect(response.status).toBe(409);
    expect(world.provider.calls).toEqual([]);
  });

  it('keeps the connection in the API database: a new app over the same file still lists it', async () => {
    const connection = await world.connect();
    const other = createApp({
      db: world.database.db,
      localToken: 'token',
      sync: {
        provider: new FakeBankProvider(),
        cipher: new FakeSecretCipher(),
        background: new TestBackgroundRunner(),
      },
    });

    const response = await other.request('/sync/connections', {
      headers: { [LOCAL_TOKEN_HEADER]: 'token' },
    });

    expect(
      ((await response.json()) as { items: { id: string }[] }).items.map((item) => item.id),
    ).toEqual([connection.id]);
  });
});

describe('buildApi runs the tasks of sync', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  const setup = async () => {
    const provider = new FakeBankProvider();
    const cipher = new FakeSecretCipher();
    const background = new TestBackgroundRunner();
    provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
    provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount()]);
    const clock = createFixedClock('2026-11-09T15:00:00.000Z');
    const app = createApp({
      db: database.db,
      localToken: 'token',
      clock,
      sync: { provider, cipher, background },
    });
    const send = (method: string, path: string, body?: unknown) =>
      app.request(path, {
        method,
        headers: {
          [LOCAL_TOKEN_HEADER]: 'token',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    await send('PUT', '/sync/settings', provider.validCredentials);
    await send('POST', '/sync/connections', { pluggyItemId: SYNC_TEST_ITEM_ID });
    await background.settled();
    // The first round is done an hour and a half before the API "starts".
    await database.db
      .updateTable('sync_runs')
      .set({ started_at: '2026-11-09T13:30:00.000Z' })
      .execute();

    return { provider, cipher, background, clock };
  };

  it('on start, a connection whose last round was more than an hour ago runs at once', async () => {
    const { provider, cipher, background, clock } = await setup();
    provider.calls.length = 0;

    const api = await buildApi({
      db: database.db,
      localToken: 'token',
      clock,
      sync: { provider, cipher, background },
    });
    await api.syncInitialRun;
    api.stop();

    expect(provider.calls).toContain(`getItem:${SYNC_TEST_ITEM_ID}`);
    const runs = await database.db
      .selectFrom('sync_runs')
      .selectAll()
      .orderBy('started_at')
      .execute();
    expect(runs.map((run) => [run.trigger, run.status])).toEqual([
      ['first_connection', 'success'],
      ['schedule', 'success'],
    ]);
  });

  it('on start, a connection read less than an hour ago is left alone', async () => {
    const { provider, cipher, background, clock } = await setup();
    await database.db
      .updateTable('sync_runs')
      .set({ started_at: '2026-11-09T14:30:00.000Z' })
      .execute();
    provider.calls.length = 0;

    const api = await buildApi({
      db: database.db,
      localToken: 'token',
      clock,
      sync: { provider, cipher, background },
    });
    await api.syncInitialRun;
    api.stop();

    expect(provider.calls).toEqual([]);
  });

  it('on start, a round the last process died in is closed as an error', async () => {
    const { provider, cipher, background, clock } = await setup();
    const [connection] = await database.db.selectFrom('sync_connections').select('id').execute();
    await database.db
      .insertInto('sync_runs')
      .values({
        id: '019a0000-0000-7000-8000-000000000001',
        connection_id: connection?.id ?? '',
        trigger: 'schedule',
        started_at: '2026-11-09T14:59:00.000Z',
        finished_at: null,
        status: 'running',
        error_code: null,
        created_count: 0,
        updated_count: 0,
        removed_count: 0,
      })
      .execute();

    const api = await buildApi({
      db: database.db,
      localToken: 'token',
      clock,
      sync: { provider, cipher, background },
    });
    await api.syncInitialRun;
    api.stop();

    const run = await database.db
      .selectFrom('sync_runs')
      .selectAll()
      .where('id', '=', '019a0000-0000-7000-8000-000000000001')
      .executeTakeFirst();
    expect(run?.status).toBe('error');
  });

  it('the gate pauses the round at start: nothing runs while the backup restores', async () => {
    const { provider, cipher, background, clock } = await setup();
    provider.calls.length = 0;

    const api = await buildApi({
      db: database.db,
      localToken: 'token',
      clock,
      sync: { provider, cipher, background, pauseGate: { isPaused: () => true } },
    });
    await api.syncInitialRun;
    api.stop();

    expect(provider.calls).toEqual([]);
  });
});

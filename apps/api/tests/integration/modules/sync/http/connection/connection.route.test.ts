import { connectionDtoSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
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

const OTHER_ITEM_ID = '22222222-2222-4222-8222-222222222222';

describe('the routes of /sync/connections', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  describe('GET /sync/connections', () => {
    it('answers an empty list when nothing is connected', async () => {
      const response = await world.send('GET', '/sync/connections');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [] });
    });

    it('lists the connections by the name of the bank, with no difference for case or accent, then by creation', async () => {
      await world.saveKeys();
      const add = async (itemId: string, name: string, code: 'other' | 'nubank' = 'other') => {
        world.provider.items.set(
          itemId,
          buildTestItem({ id: itemId, institutionName: name, institutionCode: code }),
        );
        world.provider.accounts.set(itemId, []);
        await world.connect(itemId);
      };
      await add('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Zeta Bank');
      await add('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'água Bank');
      await add('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Banco Alfa');

      const names = (await world.connectionsOf()).map((connection) => connection.institutionName);

      expect(names).toEqual(['água Bank', 'Banco Alfa', 'Zeta Bank']);
    });

    it('shows the state of each: the accounts, the last run, the history and the update of the bank', async () => {
      await world.saveKeys();
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard(), buildTestBankAccount()]);
      world.provider.transactions.set('pluggy-account-checking', [
        buildTestBankTransaction({ occurredOn: '2026-08-10' }),
        buildTestBankTransaction({ occurredOn: '2026-09-12' }),
      ]);

      const connection = await world.connect();

      expect(connection).toMatchObject({
        institutionCode: 'nubank',
        institutionName: 'Nubank',
        status: 'active',
        errorCode: null,
        lastBankUpdateAt: '2026-11-09T13:00:00.000Z',
        lastSuccessAt: '2026-11-09T15:00:00.000Z',
        isStale: false,
        history: { status: 'done', fromOn: '2026-08-10', transactionCount: 2 },
        pendingAccountMatches: [],
      });
      // Ordered by type (checking first), then by name.
      expect(connection.accounts.map((account) => [account.type, account.name])).toEqual([
        ['checking', 'Conta Corrente'],
        ['credit_card', 'Cartão Platinum'],
      ]);
      expect(connection.lastRun).toMatchObject({
        trigger: 'first_connection',
        status: 'success',
        errorCode: null,
      });
    });

    it('marks isStale when the bank has not been updated for more than 36 hours, whatever the state', async () => {
      await world.saveKeys();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ lastUpdatedAt: '2026-11-07T20:00:00.000Z' }),
      );

      const connection = await world.connect();

      expect(connection.status).toBe('active');
      expect(connection.isStale).toBe(true);
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send('GET', '/sync/connections', undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('POST /sync/connections', () => {
    it('answers 202 with the connection as the round begins: active, history running, no account yet, the run running', async () => {
      await world.saveKeys();

      const response = await world.send('POST', '/sync/connections', {
        pluggyItemId: SYNC_TEST_ITEM_ID,
      });
      const dto = connectionDtoSchema.parse(await response.json());
      await world.background.settled();

      expect(response.status).toBe(202);
      expect(dto).toMatchObject({
        status: 'active',
        errorCode: null,
        institutionCode: 'nubank',
        history: { status: 'running', fromOn: null, transactionCount: 0 },
        accounts: [],
        pendingAccountMatches: [],
        lastSuccessAt: null,
      });
      expect(dto.lastRun).toMatchObject({
        trigger: 'first_connection',
        status: 'running',
        finishedAt: null,
      });
      expect(world.background.started).toBe(1);
    });

    it('the round that goes on in the background brings the accounts and ends the history', async () => {
      await world.saveKeys();

      const connection = await world.connect();

      expect(connection.accounts).toHaveLength(1);
      expect(connection.history.status).toBe('done');
      expect(connection.lastRun?.status).toBe('success');
    });

    it.each([
      ['a missing id', {}],
      ['an id of 35 characters', { pluggyItemId: '1'.repeat(35) }],
      ['an id of 37 characters', { pluggyItemId: '1'.repeat(37) }],
      ['an id that is not text', { pluggyItemId: 123 }],
    ])('answers 400 for %s', async (_name, body) => {
      await world.saveKeys();

      const response = await world.send('POST', '/sync/connections', body);

      expect(response.status).toBe(400);
      expect((await response.json()) as { code: string }).toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });

    it('answers 422 SYNC_NOT_CONFIGURED without keys, and writes nothing', async () => {
      await world.expectError(
        await world.send('POST', '/sync/connections', { pluggyItemId: SYNC_TEST_ITEM_ID }),
        422,
        'SYNC_NOT_CONFIGURED',
      );

      expect(await world.connectionsOf()).toEqual([]);
    });

    it('answers 422 SYNC_ITEM_NOT_FOUND when the Pluggy does not have the item, and writes nothing', async () => {
      await world.saveKeys();

      await world.expectError(
        await world.send('POST', '/sync/connections', { pluggyItemId: OTHER_ITEM_ID }),
        422,
        'SYNC_ITEM_NOT_FOUND',
      );

      expect(await world.connectionsOf()).toEqual([]);
    });

    it('answers 422 SYNC_CREDENTIALS_INVALID when the saved keys stopped being valid', async () => {
      await world.saveKeys();
      world.provider.validCredentials = { clientId: 'other', clientSecret: 'other' };

      await world.expectError(
        await world.send('POST', '/sync/connections', { pluggyItemId: SYNC_TEST_ITEM_ID }),
        422,
        'SYNC_CREDENTIALS_INVALID',
      );
    });

    it('answers 422 SYNC_PROVIDER_UNAVAILABLE when the Pluggy cannot be reached', async () => {
      await world.saveKeys();
      world.provider.fail('getItem', 'unavailable');

      await world.expectError(
        await world.send('POST', '/sync/connections', { pluggyItemId: SYNC_TEST_ITEM_ID }),
        422,
        'SYNC_PROVIDER_UNAVAILABLE',
      );
    });

    it('answers 409 SYNC_CONNECTION_ALREADY_EXISTS for an item that is active, with the id and the state', async () => {
      await world.saveKeys();
      const connection = await world.connect();

      const response = await world.send('POST', '/sync/connections', {
        pluggyItemId: SYNC_TEST_ITEM_ID,
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        code: 'SYNC_CONNECTION_ALREADY_EXISTS',
        details: { connectionId: connection.id, status: 'active' },
      });
    });

    it('answers 409 for an item that is in error too', async () => {
      await world.saveKeys();
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'LOGIN_ERROR' }),
      );
      await world.retry(connection.id);

      const response = await world.send('POST', '/sync/connections', {
        pluggyItemId: SYNC_TEST_ITEM_ID,
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        code: 'SYNC_CONNECTION_ALREADY_EXISTS',
        details: { connectionId: connection.id, status: 'error' },
      });
    });

    it('an item that was disconnected is brought back (202, not an error), with the same id', async () => {
      await world.saveKeys();
      const first = await world.connect();
      await world.send('DELETE', `/sync/connections/${first.id}`);

      const again = await world.connect();

      expect(again.id).toBe(first.id);
      expect(again.status).toBe('active');
      expect(await world.connectionsOf()).toHaveLength(1);
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send(
          'POST',
          '/sync/connections',
          { pluggyItemId: SYNC_TEST_ITEM_ID },
          { [LOCAL_TOKEN_HEADER]: 'wrong' },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('DELETE /sync/connections/:id', () => {
    it('answers 204: the connection is disconnected, its accounts stay and become manual, history and links stay', async () => {
      await world.saveKeys();
      world.provider.transactions.set('pluggy-account-checking', [
        buildTestBankTransaction({ amountCents: -20000 }),
      ]);
      const connection = await world.connect();

      const response = await world.send('DELETE', `/sync/connections/${connection.id}`);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      const [after] = await world.connectionsOf();
      expect(after).toMatchObject({ status: 'disconnected', errorCode: null });
      const accounts = await world.accountsTable();
      expect(accounts.map((account) => [account.source, account.bank_balance_cents])).toEqual([
        ['manual', null],
      ]);
      const transactions = await world.transactionsOf(accounts[0]?.id ?? '');
      expect(transactions.filter((transaction) => transaction.origin === 'bank')).toHaveLength(1);
      expect(
        await world.database.db.selectFrom('sync_account_links').selectAll().execute(),
      ).toHaveLength(1);
      expect(
        await world.database.db.selectFrom('sync_transaction_links').selectAll().execute(),
      ).toHaveLength(1);
    });

    it('opens the manual balance at the last balance of the bank, with an adjustment of today for the difference', async () => {
      await world.saveKeys();
      // The bank said R$ 1.000,00 and the transactions add up to -R$ 200,00: the adjustment is R$ 1.200,00.
      world.provider.transactions.set('pluggy-account-checking', [
        buildTestBankTransaction({ amountCents: -20000 }),
      ]);
      const connection = await world.connect();

      await world.send('DELETE', `/sync/connections/${connection.id}`);

      const [account] = await world.accountsTable();
      const transactions = await world.transactionsOf(account?.id ?? '');
      const adjustment = transactions.find(
        (transaction) => transaction.nature === 'balance_adjustment',
      );
      expect(adjustment).toMatchObject({
        origin: 'manual',
        amount_cents: 120000,
        occurred_on: '2026-11-09',
      });
      const shown = await world.send('GET', `/accounts/${account?.id ?? ''}`);
      expect(((await shown.json()) as { balanceCents: number }).balanceCents).toBe(100000);
    });

    it('writes no adjustment when the transactions already add up to the balance of the bank', async () => {
      await world.saveKeys();
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
        buildTestBankAccount({ balanceCents: -20000 }),
      ]);
      world.provider.transactions.set('pluggy-account-checking', [
        buildTestBankTransaction({ amountCents: -20000 }),
      ]);
      const connection = await world.connect();

      await world.send('DELETE', `/sync/connections/${connection.id}`);

      const [account] = await world.accountsTable();
      const transactions = await world.transactionsOf(account?.id ?? '');
      expect(
        transactions.filter((transaction) => transaction.nature === 'balance_adjustment'),
      ).toEqual([]);
    });

    it('a card becomes manual with no adjustment (its number is the invoice)', async () => {
      await world.saveKeys();
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
      world.provider.transactions.set('pluggy-account-card', [
        buildTestBankTransaction({ amountCents: -8900, method: 'credit' }),
      ]);
      const connection = await world.connect();

      await world.send('DELETE', `/sync/connections/${connection.id}`);

      const [account] = await world.accountsTable();
      expect(account).toMatchObject({
        type: 'credit_card',
        source: 'manual',
        bank_balance_cents: null,
      });
      const transactions = await world.transactionsOf(account?.id ?? '');
      expect(transactions.map((transaction) => transaction.nature)).toEqual(['expense']);
    });

    it('does not call the Pluggy (revoking the access is in the Meu Pluggy)', async () => {
      await world.saveKeys();
      const connection = await world.connect();
      world.provider.calls.length = 0;

      await world.send('DELETE', `/sync/connections/${connection.id}`);

      expect(world.provider.calls).toEqual([]);
    });

    it('repeating it on a connection already disconnected is 204 and changes nothing', async () => {
      await world.saveKeys();
      const connection = await world.connect();
      await world.send('DELETE', `/sync/connections/${connection.id}`);
      const before = await world.transactionsOf((await world.accountsTable())[0]?.id ?? '');

      const response = await world.send('DELETE', `/sync/connections/${connection.id}`);

      expect(response.status).toBe(204);
      expect(await world.transactionsOf((await world.accountsTable())[0]?.id ?? '')).toEqual(
        before,
      );
    });

    it('answers 404 SYNC_CONNECTION_NOT_FOUND for an id that does not exist', async () => {
      await world.expectError(
        await world.send('DELETE', '/sync/connections/019a0000-0000-7000-8000-000000000000'),
        404,
        'SYNC_CONNECTION_NOT_FOUND',
      );
    });

    it('answers 400 for an id that is not a uuid', async () => {
      const response = await world.send('DELETE', '/sync/connections/not-an-id');

      expect(response.status).toBe(400);
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send(
          'DELETE',
          '/sync/connections/019a0000-0000-7000-8000-000000000000',
          undefined,
          {
            [LOCAL_TOKEN_HEADER]: 'wrong',
          },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });

    it('a connection disconnected is no longer read by the scheduled round', async () => {
      await world.saveKeys();
      const connection = await world.connect();
      await world.send('DELETE', `/sync/connections/${connection.id}`);
      world.moveTo('2026-11-09T18:00:00.000Z');
      world.provider.calls.length = 0;

      const { ranCount } = await world.parts.runDueConnections.run();

      expect(ranCount).toBe(0);
      expect(world.provider.calls).toEqual([]);
    });
  });
});

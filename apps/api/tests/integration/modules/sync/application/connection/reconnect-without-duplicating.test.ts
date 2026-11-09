import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
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

const NEW_ITEM_ID = '22222222-2222-4222-8222-222222222222';
const MISSING = '019a0000-0000-7000-8000-000000000000';

describe('reconnecting without duplicating, and the choice of the account (PUT /sync/connections/:id/account-matches)', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const history = () => [
    buildTestBankTransaction({
      id: 'old-1',
      description: 'Mercado',
      amountCents: -1000,
      occurredOn: '2026-10-20',
    }),
    buildTestBankTransaction({
      id: 'old-2',
      description: 'Salário',
      amountCents: 500000,
      occurredOn: '2026-10-25',
      method: 'transfer',
    }),
  ];
  const accountRows = () => world.database.db.selectFrom('accounts').selectAll().execute();
  const bankTransactions = () =>
    world.database.db.selectFrom('transactions').selectAll().where('origin', '=', 'bank').execute();

  // The first item, connected and then disconnected (or left in error).
  const firstItem = async (options: { error?: boolean } = {}) => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount({ id: 'old-checking' })]);
    world.provider.transactions.set('old-checking', history());
    const connection = await world.connect();
    if (options.error) {
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'CONSENT_REVOKED' }),
      );
      await world.retry(connection.id);
    } else {
      await world.send('DELETE', `/sync/connections/${connection.id}`);
    }

    return connection;
  };

  // The Meu Pluggy gave a new item, with accounts and transactions of new ids.
  const newItem = (accounts = [buildTestBankAccount({ id: 'new-checking' })]) => {
    world.provider.items.set(NEW_ITEM_ID, buildTestItem({ id: NEW_ITEM_ID }));
    world.provider.accounts.set(NEW_ITEM_ID, accounts);
    for (const account of accounts) {
      world.provider.transactions.set(
        account.id,
        history().map((transaction) => ({ ...transaction, id: `new-${transaction.id}` })),
      );
    }
  };

  it('a new item adopts the account of the old one that was disconnected: same account, back to the bank, and the history does not duplicate', async () => {
    const old = await firstItem();
    const [before] = await accountRows();
    newItem();

    const connection = await world.connect(NEW_ITEM_ID);

    expect(connection.id).not.toBe(old.id);
    const accounts = await accountRows();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id: before?.id,
      source: 'pluggy',
      bank_balance_cents: 100000,
    });
    expect(await bankTransactions()).toHaveLength(2);
    expect(connection.accounts.map((account) => account.accountId)).toEqual([before?.id]);
    const links = await world.database.db.selectFrom('sync_account_links').selectAll().execute();
    expect(links.map((link) => [link.pluggy_account_id, link.connection_id])).toEqual([
      ['new-checking', connection.id],
    ]);
    const transactionLinks = await world.database.db
      .selectFrom('sync_transaction_links')
      .selectAll()
      .execute();
    expect(transactionLinks.map((link) => link.pluggy_transaction_id).toSorted()).toEqual([
      'new-old-1',
      'new-old-2',
    ]);
    expect((await world.runsOf(connection.id))[0]).toMatchObject({ createdCount: 0 });
  });

  it('an old connection in error counts as without an active connection', async () => {
    await firstItem({ error: true });
    newItem();

    await world.connect(NEW_ITEM_ID);

    expect(await accountRows()).toHaveLength(1);
    expect(await bankTransactions()).toHaveLength(2);
  });

  it('the edit of Lucas on a transaction survives the reconnection (the new id gets the bank version applied on top)', async () => {
    await firstItem();
    const [mercado] = (await bankTransactions()).filter((row) => row.description === 'Mercado');
    await world.send('PATCH', `/transactions/${mercado?.id ?? ''}`, { description: 'Feira' });
    newItem();

    await world.connect(NEW_ITEM_ID);

    const rows = await bankTransactions();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === mercado?.id)).toMatchObject({
      description: 'Feira',
      bank_description: 'Mercado',
    });
  });

  it('the same item registered again after it was disconnected brings the accounts back to the bank without duplicating', async () => {
    const old = await firstItem();

    const again = await world.connect();

    expect(again.id).toBe(old.id);
    const accounts = await accountRows();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.source).toBe('pluggy');
    expect(await bankTransactions()).toHaveLength(2);
  });

  it('another final number is another account: the account of the new item is created', async () => {
    await firstItem();
    newItem([buildTestBankAccount({ id: 'new-checking', numberHint: '0000' })]);

    await world.connect(NEW_ITEM_ID);

    expect(await accountRows()).toHaveLength(2);
    expect(await bankTransactions()).toHaveLength(4);
  });

  it('an account Lucas made by hand, with no connection ever, is not taken', async () => {
    await insertTestAccount(world.database.db, { name: 'Manual', institution_code: 'nubank' });
    newItem();

    await world.connect(NEW_ITEM_ID);

    expect(await accountRows()).toHaveLength(2);
  });

  it('an account whose connection is active is not taken by another item', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount({ id: 'old-checking' })]);
    await world.connect();
    newItem();

    await world.connect(NEW_ITEM_ID);

    expect(await accountRows()).toHaveLength(2);
  });

  it('a card is adopted by its last 4 digits', async () => {
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard({ id: 'old-card' })]);
    const old = await world.connect();
    await world.send('DELETE', `/sync/connections/${old.id}`);
    newItem([buildTestBankCard({ id: 'new-card', numberHint: '1234' })]);

    await world.connect(NEW_ITEM_ID);

    expect(await accountRows()).toHaveLength(1);
  });

  describe('with more than one candidate', () => {
    const twoOldAccounts = async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
        buildTestBankAccount({ id: 'old-a', name: 'Conta A', numberHint: null }),
        buildTestBankAccount({ id: 'old-b', name: 'Conta B', numberHint: null }),
      ]);
      const old = await world.connect();
      await world.send('DELETE', `/sync/connections/${old.id}`);
    };
    const waiting = async () => {
      await twoOldAccounts();
      newItem([buildTestBankAccount({ id: 'new-checking', numberHint: null })]);

      return world.connect(NEW_ITEM_ID);
    };

    it('the account waits for Lucas: it is listed with the candidates, and it is not imported', async () => {
      const connection = await waiting();

      expect(connection.accounts).toEqual([]);
      expect(connection.pendingAccountMatches).toHaveLength(1);
      expect(connection.pendingAccountMatches[0]).toMatchObject({
        pluggyAccountId: 'new-checking',
        name: 'Conta Corrente',
        type: 'checking',
        numberHint: null,
      });
      expect(
        connection.pendingAccountMatches[0]?.candidates
          .map((candidate) => [candidate.name, candidate.source])
          .toSorted(),
      ).toEqual([
        ['Conta A', 'manual'],
        ['Conta B', 'manual'],
      ]);
      expect(await accountRows()).toHaveLength(2);
      expect(await bankTransactions()).toHaveLength(0);
    });

    it('a round while it waits does not import it either', async () => {
      const connection = await waiting();
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await bankTransactions()).toHaveLength(0);
      expect(
        (await world.connectionsOf()).find((item) => item.id === connection.id)
          ?.pendingAccountMatches,
      ).toHaveLength(1);
    });

    it('Lucas picks one: 202, the account takes the link, goes back to the bank and the round imports its history', async () => {
      const connection = await waiting();
      const candidate = connection.pendingAccountMatches[0]?.candidates[0];

      const response = await world.send(
        'PUT',
        `/sync/connections/${connection.id}/account-matches`,
        {
          matches: [{ pluggyAccountId: 'new-checking', accountId: candidate?.accountId ?? '' }],
        },
      );
      await world.background.settled();

      expect(response.status).toBe(202);
      const [after] = (await world.connectionsOf()).filter((item) => item.id === connection.id);
      expect(after?.pendingAccountMatches).toEqual([]);
      expect(after?.accounts.map((account) => account.accountId)).toEqual([candidate?.accountId]);
      const accounts = await accountRows();
      expect(accounts).toHaveLength(2);
      expect(accounts.find((account) => account.id === candidate?.accountId)?.source).toBe(
        'pluggy',
      );
      expect(await bankTransactions()).toHaveLength(2);
    });

    it('Lucas says it is a new account (null): it is created from what the Pluggy says of it, and its history comes', async () => {
      const connection = await waiting();

      const response = await world.send(
        'PUT',
        `/sync/connections/${connection.id}/account-matches`,
        {
          matches: [{ pluggyAccountId: 'new-checking', accountId: null }],
        },
      );
      await world.background.settled();

      expect(response.status).toBe(202);
      expect(await accountRows()).toHaveLength(3);
      expect(await bankTransactions()).toHaveLength(2);
      expect(
        (await world.connectionsOf()).find((item) => item.id === connection.id)?.accounts,
      ).toHaveLength(1);
    });

    it('answers 422 SYNC_ACCOUNT_MATCH_INVALID for an account that is not a candidate', async () => {
      const connection = await waiting();
      const stranger = await insertTestAccount(world.database.db, {
        name: 'Outra',
        institution_code: 'inter',
      });

      await world.expectError(
        await world.send('PUT', `/sync/connections/${connection.id}/account-matches`, {
          matches: [{ pluggyAccountId: 'new-checking', accountId: stranger }],
        }),
        422,
        'SYNC_ACCOUNT_MATCH_INVALID',
      );
      expect(
        (await world.connectionsOf()).find((item) => item.id === connection.id)
          ?.pendingAccountMatches,
      ).toHaveLength(1);
    });

    it('answers 422 for a Pluggy account that is not waiting', async () => {
      const connection = await waiting();
      const candidate = connection.pendingAccountMatches[0]?.candidates[0];

      await world.expectError(
        await world.send('PUT', `/sync/connections/${connection.id}/account-matches`, {
          matches: [{ pluggyAccountId: 'not-there', accountId: candidate?.accountId ?? '' }],
        }),
        422,
        'SYNC_ACCOUNT_MATCH_INVALID',
      );
    });

    it('answers 422 for the same Pluggy account twice', async () => {
      const connection = await waiting();
      const candidate = connection.pendingAccountMatches[0]?.candidates[0];

      await world.expectError(
        await world.send('PUT', `/sync/connections/${connection.id}/account-matches`, {
          matches: [
            { pluggyAccountId: 'new-checking', accountId: candidate?.accountId ?? '' },
            { pluggyAccountId: 'new-checking', accountId: null },
          ],
        }),
        422,
        'SYNC_ACCOUNT_MATCH_INVALID',
      );
    });

    it('no choice at all answers 202 and opens no round (there is nothing to import)', async () => {
      const connection = await waiting();
      const runsBefore = (await world.runsOf(connection.id)).length;
      const started = world.background.started;
      world.provider.calls.length = 0;

      const response = await world.send(
        'PUT',
        `/sync/connections/${connection.id}/account-matches`,
        { matches: [] },
      );

      expect(response.status).toBe(202);
      expect(await world.runsOf(connection.id)).toHaveLength(runsBefore);
      expect(world.background.started).toBe(started);
      expect(world.provider.calls).toEqual([]);
    });

    it('answers 404 SYNC_CONNECTION_NOT_FOUND', async () => {
      await world.expectError(
        await world.send('PUT', `/sync/connections/${MISSING}/account-matches`, { matches: [] }),
        404,
        'SYNC_CONNECTION_NOT_FOUND',
      );
    });

    it('answers 400 for a body out of the schema or an id that is not a uuid', async () => {
      expect(
        (await world.send('PUT', `/sync/connections/${MISSING}/account-matches`, {})).status,
      ).toBe(400);
      expect(
        (
          await world.send('PUT', `/sync/connections/${MISSING}/account-matches`, {
            matches: [{ pluggyAccountId: 'x', accountId: 'not-a-uuid' }],
          })
        ).status,
      ).toBe(400);
      expect(
        (await world.send('PUT', '/sync/connections/nope/account-matches', { matches: [] })).status,
      ).toBe(400);
    });

    it('answers 422 SYNC_CONNECTION_DISCONNECTED for a connection that was disconnected', async () => {
      const connection = await waiting();
      await world.send('DELETE', `/sync/connections/${connection.id}`);

      await world.expectError(
        await world.send('PUT', `/sync/connections/${connection.id}/account-matches`, {
          matches: [],
        }),
        422,
        'SYNC_CONNECTION_DISCONNECTED',
      );
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send(
          'PUT',
          `/sync/connections/${MISSING}/account-matches`,
          { matches: [] },
          {
            [LOCAL_TOKEN_HEADER]: 'wrong',
          },
        ),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});

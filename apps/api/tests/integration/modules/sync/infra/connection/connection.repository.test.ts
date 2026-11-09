import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import { KyselyConnectionRepository } from '#/modules/sync/infra/connection/connection.repository.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const NOW = '2026-11-09T15:00:00.000Z';

describe('KyselyConnectionRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyConnectionRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyConnectionRepository(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const connection = (itemId: string, name = 'Nubank') =>
    Connection.register(
      {
        pluggyItemId: itemId,
        institutionCode: 'nubank',
        institutionName: name,
        lastBankUpdateAt: null,
      },
      NOW,
    );
  const link = (overrides: Partial<AccountLink.Attributes> = {}) =>
    new AccountLink({
      pluggyAccountId: 'pa1',
      pluggyName: 'Conta Corrente',
      pluggyType: 'checking',
      accountId: null,
      numberHint: '4321',
      cursorOn: null,
      ...overrides,
    });

  it('saves and reads the connection as it was, with its links', async () => {
    const accountId = await insertTestAccount(database.db);
    const saved = connection('item-1');
    saved.putLink(link({ accountId, cursorOn: '2026-11-09' }));
    saved.putLink(
      link({ pluggyAccountId: 'pa2', pluggyName: 'Cartão', pluggyType: 'credit_card' }),
    );
    saved.recordSuccess(
      { lastBankUpdateAt: '2026-11-09T13:00:00.000Z', oldestTransactionOn: '2026-01-05' },
      NOW,
    );

    await repository.save(saved);
    const found = await repository.findById(saved.id);

    expect(found).toMatchObject({
      id: saved.id,
      pluggyItemId: 'item-1',
      status: 'active',
      historyStatus: 'done',
      historyFromOn: '2026-01-05',
      lastBankUpdateAt: '2026-11-09T13:00:00.000Z',
      lastSuccessAt: NOW,
    });
    expect(
      found?.accountLinks.map((l) => [l.pluggyAccountId, l.accountId, l.cursorOn, l.pluggyType]),
    ).toEqual([
      ['pa2', null, null, 'credit_card'],
      ['pa1', accountId, '2026-11-09', 'checking'],
    ]);
  });

  it('finds by the item of the Pluggy, and answers null for what does not exist', async () => {
    const saved = connection('item-1');
    await repository.save(saved);

    expect((await repository.findByPluggyItemId('item-1'))?.id).toBe(saved.id);
    expect(await repository.findByPluggyItemId('nope')).toBeNull();
    expect(await repository.findById('nope')).toBeNull();
  });

  it('saving again updates the state and replaces the links: the ones it no longer has are removed', async () => {
    const saved = connection('item-1');
    saved.putLink(link());
    saved.putLink(link({ pluggyAccountId: 'pa2' }));
    await repository.save(saved);

    saved.disconnect(NOW);
    saved.accountLinks = [saved.accountLinks[0] as AccountLink];
    await repository.save(saved);

    const found = await repository.findById(saved.id);
    expect(found?.status).toBe('disconnected');
    expect(found?.accountLinks).toHaveLength(1);
    expect(await database.db.selectFrom('sync_connections').selectAll().execute()).toHaveLength(1);
  });

  it('one connection per item of the Pluggy', async () => {
    await repository.save(connection('item-1'));

    await expect(repository.save(connection('item-1'))).rejects.toThrow();
  });

  it('lists every connection, disconnected ones included', async () => {
    const gone = connection('item-1');
    gone.disconnect(NOW);
    await repository.save(gone);
    await repository.save(connection('item-2'));

    expect((await repository.list()).map((item) => item.pluggyItemId).toSorted()).toEqual([
      'item-1',
      'item-2',
    ]);
  });

  it('says who holds each account: the connection, its state and the end of the number', async () => {
    const mine = await insertTestAccount(database.db);
    const free = await insertTestAccount(database.db);
    const saved = connection('item-1');
    saved.putLink(link({ accountId: mine }));
    saved.disconnect(NOW);
    await repository.save(saved);

    const owners = await repository.findOwnersOfAccounts([mine, free]);

    expect([...owners.keys()]).toEqual([mine]);
    expect(owners.get(mine)).toEqual({
      connectionId: saved.id,
      connectionStatus: 'disconnected',
      numberHint: '4321',
      pluggyType: 'checking',
    });
  });

  it('an account has one link only: another link to it is refused until the old one is released', async () => {
    const accountId = await insertTestAccount(database.db);
    const first = connection('item-1');
    first.putLink(link({ accountId }));
    await repository.save(first);
    const second = connection('item-2');
    second.putLink(link({ pluggyAccountId: 'pb1', accountId }));

    await expect(repository.save(second)).rejects.toThrow();

    await repository.releaseAccounts([accountId]);
    await repository.save(second);
    expect((await repository.findOwnersOfAccounts([accountId])).get(accountId)?.connectionId).toBe(
      second.id,
    );
  });

  it('the account that is deleted takes its link with it (the connection stays)', async () => {
    const accountId = await insertTestAccount(database.db);
    const saved = connection('item-1');
    saved.putLink(link({ accountId }));
    await repository.save(saved);

    await database.db.deleteFrom('accounts').where('id', '=', accountId).execute();

    expect((await repository.findById(saved.id))?.accountLinks).toEqual([]);
  });
});

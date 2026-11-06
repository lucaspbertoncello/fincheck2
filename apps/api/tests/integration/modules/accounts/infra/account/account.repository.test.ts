import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('KyselyAccountRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyAccountRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyAccountRepository(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('saves and reads back a manual account', async () => {
    const account = buildTestAccount({ institutionCode: 'other', institutionName: 'Sicredi' });

    await repository.save(account);
    const found = await repository.findById(account.id);

    expect(found).toEqual(account);
    expect(found?.creditCard).toBe(null);
  });

  it('saves and reads back a card with all its data, in the two tables', async () => {
    const card = buildTestAccount({ card: true });

    await repository.save(card);
    const found = await repository.findById(card.id);

    expect(found).toEqual(card);
    const rows = await database.db.selectFrom('credit_cards').selectAll().execute();
    expect(rows).toEqual([
      {
        account_id: card.id,
        brand: 'visa',
        last4: '1234',
        closing_day: 5,
        due_day: 12,
        limit_cents: null,
        theme_id: null,
      },
    ]);
  });

  it('keeps the bank balance of a Pluggy account', async () => {
    const pluggy = buildTestAccount({ source: 'pluggy', bankBalanceCents: -4321 });

    await repository.save(pluggy);

    const found = await repository.findById(pluggy.id);
    expect(found?.bankBalance?.cents).toBe(-4321);
    expect(found?.bankBalanceAt).toBe('2026-11-06T12:00:00.000Z');
  });

  it('updates in place: the account, the archive stamp and the card data', async () => {
    const card = buildTestAccount({ card: true });
    await repository.save(card);

    card.edit(
      { name: 'Novo nome', creditCard: { closingDay: 28, limitCents: 700000, last4: null } },
      '2026-11-08T10:00:00.000Z',
    );
    card.archive('2026-11-09T10:00:00.000Z');
    await repository.save(card);

    const found = await repository.findById(card.id);
    expect(found).toEqual(card);
    expect(found?.creditCard).toMatchObject({ closingDay: 28, last4: null });
    expect(found?.creditCard?.limit?.cents).toBe(700000);
    expect(await database.db.selectFrom('accounts').select('id').execute()).toHaveLength(1);
  });

  it('answers null for an unknown id', async () => {
    expect(await repository.findById('nope')).toBe(null);
  });

  it('lists without the archived unless asked', async () => {
    const active = buildTestAccount({ name: 'Ativa' });
    const archived = buildTestAccount({ name: 'Velha', archivedAt: '2026-10-01T00:00:00.000Z' });
    await repository.save(active);
    await repository.save(archived);

    const onlyActive = await repository.list({ includeArchived: false });
    const all = await repository.list({ includeArchived: true });

    expect(onlyActive.map((account) => account.id)).toEqual([active.id]);
    expect(all).toHaveLength(2);
  });

  it('deletes the account and its card data', async () => {
    const card = buildTestAccount({ card: true });
    await repository.save(card);

    await repository.delete(card.id);

    expect(await repository.findById(card.id)).toBe(null);
    expect(await database.db.selectFrom('credit_cards').select('account_id').execute()).toEqual([]);
  });

  it('writes inside a unit of work and rolls back with it', async () => {
    const unitOfWork = new KyselyUnitOfWork(database.db);
    const account = buildTestAccount();

    await expect(
      unitOfWork.run(async (executor) => {
        await repository.save(account, executor);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await repository.findById(account.id)).toBe(null);
  });
});

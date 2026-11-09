import { categoryDtoSchema } from '@fincheck/shared/categories/category/category.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const listSchema = listResponseSchema(categoryDtoSchema);

describe('categories routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
  });

  afterEach(async () => {
    await database.destroy();
  });

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });

  const list = async (query = '') => {
    const response = await send('GET', `/categories${query}`);
    expect(response.status).toBe(200);

    return listSchema.parse(await response.json()).items;
  };

  const create = async (body: unknown) => {
    const response = await send('POST', '/categories', body);
    expect(response.status).toBe(201);

    return categoryDtoSchema.parse(await response.json());
  };

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  const idOf = async (name: string) => {
    const found = (await list('?status=all')).find((category) => category.name === name);
    if (!found) throw new Error(`No category ${name}`);

    return found.id;
  };

  describe('GET /categories', () => {
    it('brings the ready-made categories, active, by name with no difference for accent', async () => {
      const items = await list();

      expect(items).toHaveLength(30);
      expect(items.every((item) => item.isDefault && item.archivedAt === null)).toBe(true);
      const expenses = items.filter((item) => item.kind === 'expense').map((item) => item.name);
      expect(expenses).toEqual([
        'Amigos e família',
        'Assinaturas',
        'Combustível',
        'Compras',
        'Cuidados pessoais',
        'Delivery',
        'Educação',
        'Esportes',
        'Estádio',
        'Impostos',
        'Lazer',
        'Maconha',
        'Mercado',
        'Moradia',
        'Outros',
        'Pets',
        'Presentes e doações',
        'Restaurantes',
        'Rotação entre contas',
        'Saúde',
        'Taxas',
        'Tecnologia',
        'Transporte',
        'Viagem',
      ]);
      expect(items[0]).toMatchObject({ transactionCount: 0, ruleCount: 0, lastUsedOn: null });
    });

    it('marks only "Rotação entre contas" as a transfer (it does not count as spending)', async () => {
      const items = await list();

      expect(items.filter((item) => item.isTransfer).map((item) => item.name)).toEqual([
        'Rotação entre contas',
      ]);
      expect(items.every((item) => typeof item.isTransfer === 'boolean')).toBe(true);
    });

    it('filters by kind and by status', async () => {
      const archived = await create({ kind: 'income', name: 'Antiga', icon: 'coins' });
      await send('POST', `/categories/${archived.id}/archive`);

      expect((await list('?kind=income')).map((item) => item.name)).not.toContain('Antiga');
      expect((await list('?kind=income&status=archived')).map((item) => item.name)).toEqual([
        'Antiga',
      ]);
      expect(await list('?kind=income&status=all')).toHaveLength(7);
      expect(await list('?kind=expense&status=archived')).toEqual([]);
    });

    it('counts the transactions in the category, the ones with a part in it once, and the last use', async () => {
      const food = await idOf('Restaurantes');
      const market = await idOf('Mercado');
      const accountId = await insertTestAccount(database.db);
      await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
        occurred_on: '2026-10-10',
      });
      // Ignored and old ones count too.
      await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
        occurred_on: '2026-09-01',
        ignored_at: NOW,
      });
      // A split with two parts in the same category is one transaction; a part in the other one.
      const split = await insertTestTransaction(database.db, accountId, {
        occurred_on: '2026-11-02',
      });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: split,
            position: 1,
            amount_cents: -600,
            nature: 'expense',
            category_id: food,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: split,
            position: 2,
            amount_cents: -650,
            nature: 'expense',
            category_id: food,
            description: null,
          },
        ])
        .execute();
      // The same transaction with the category and a part in it counts once.
      const both = await insertTestTransaction(database.db, accountId, {
        category_id: market,
        category_source: 'user',
        occurred_on: '2026-08-15',
      });
      await database.db
        .insertInto('transaction_splits')
        .values({
          id: generateId(),
          transaction_id: both,
          position: 1,
          amount_cents: -100,
          nature: 'expense',
          category_id: market,
          description: null,
        })
        .execute();

      const items = await list();

      expect(items.find((item) => item.id === food)).toMatchObject({
        transactionCount: 3,
        lastUsedOn: '2026-11-02',
      });
      expect(items.find((item) => item.id === market)).toMatchObject({
        transactionCount: 1,
        lastUsedOn: '2026-08-15',
      });
    });

    it('counts the rules whose action is the category, on or off', async () => {
      const food = await idOf('Restaurantes');
      for (const [pattern, enabled] of [
        ['IFOOD', 1],
        ['RAPPI', 0],
      ] as const) {
        await database.db
          .insertInto('category_rules')
          .values({
            id: generateId(),
            description_contains: pattern,
            counterparty_contains: null,
            kind: null,
            account_id: null,
            amount_min_cents: null,
            amount_max_cents: null,
            category_id: food,
            enabled,
            created_at: NOW,
            updated_at: NOW,
          })
          .execute();
      }

      expect((await list()).find((item) => item.id === food)?.ruleCount).toBe(2);
    });

    it('refuses a status or a kind that does not exist', async () => {
      await expectError(await send('GET', '/categories?status=gone'), 400, 'VALIDATION_FAILED');
      await expectError(await send('GET', '/categories?kind=transfer'), 400, 'VALIDATION_FAILED');
    });
  });

  describe('POST /categories', () => {
    it('creates a category that is not a default one, with no use yet', async () => {
      const dto = await create({ kind: 'expense', name: ' Marmitas ', icon: 'pet' });

      expect(dto).toEqual({
        id: dto.id,
        kind: 'expense',
        name: 'Marmitas',
        icon: 'pet',
        isDefault: false,
        isTransfer: false,
        archivedAt: null,
        transactionCount: 0,
        ruleCount: 0,
        lastUsedOn: null,
      });
      expect(await list()).toHaveLength(31);
    });

    it('refuses a name the same kind already has, whatever the case or the accent', async () => {
      for (const name of ['Saúde', 'SAUDE', 'saúde', ' saude ']) {
        await expectError(
          await send('POST', '/categories', { kind: 'expense', name, icon: 'health' }),
          409,
          'CATEGORY_NAME_TAKEN',
        );
      }
    });

    it('lets the other kind use the name', async () => {
      const dto = await create({ kind: 'income', name: 'Saúde', icon: 'health' });

      expect(dto.kind).toBe('income');
    });

    it('keeps the name of an archived category taken', async () => {
      const id = await idOf('Lazer');
      await send('POST', `/categories/${id}/archive`);

      await expectError(
        await send('POST', '/categories', { kind: 'expense', name: 'lazer', icon: 'fun' }),
        409,
        'CATEGORY_NAME_TAKEN',
      );
    });

    it('refuses what the schema refuses', async () => {
      for (const wrong of [
        { name: '' },
        { name: '   ' },
        { name: 'x'.repeat(41) },
        { icon: 'not-an-icon' },
        { kind: 'transfer' },
      ]) {
        await expectError(
          await send('POST', '/categories', {
            kind: 'expense',
            name: 'Nova',
            icon: 'pet',
            ...wrong,
          }),
          400,
          'VALIDATION_FAILED',
        );
      }
      await expectError(await send('POST', '/categories', {}), 400, 'VALIDATION_FAILED');
      expect(await list()).toHaveLength(30);
    });

    it('takes a name of exactly 40 characters', async () => {
      const dto = await create({ kind: 'expense', name: 'x'.repeat(40), icon: 'pet' });

      expect(dto.name).toHaveLength(40);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('renames and changes the icon, and keeps the kind', async () => {
      const id = await idOf('Mercado');

      const dto = categoryDtoSchema.parse(
        await (
          await send('PATCH', `/categories/${id}`, { name: 'Supermercado', icon: 'gift' })
        ).json(),
      );

      expect(dto).toMatchObject({ id, kind: 'expense', name: 'Supermercado', icon: 'gift' });
      expect(dto.isDefault).toBe(true);
      expect(dto.isTransfer).toBe(false);
    });

    it('does not let the body make a category a transfer', async () => {
      const id = await idOf('Mercado');

      await expectError(
        await send('PATCH', `/categories/${id}`, { isTransfer: true }),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('takes only the name, or only the icon', async () => {
      const id = await idOf('Mercado');

      const named = await send('PATCH', `/categories/${id}`, { name: 'Feira' });
      const iconed = await send('PATCH', `/categories/${id}`, { icon: 'gift' });

      expect(categoryDtoSchema.parse(await named.json())).toMatchObject({
        name: 'Feira',
        icon: 'cart',
      });
      expect(categoryDtoSchema.parse(await iconed.json())).toMatchObject({
        name: 'Feira',
        icon: 'gift',
      });
    });

    it('lets a category change only the case of its own name', async () => {
      const id = await idOf('Mercado');

      const response = await send('PATCH', `/categories/${id}`, { name: 'MERCADO' });

      expect(categoryDtoSchema.parse(await response.json()).name).toBe('MERCADO');
    });

    it('works on an archived category', async () => {
      const id = await idOf('Mercado');
      await send('POST', `/categories/${id}/archive`);

      const dto = categoryDtoSchema.parse(
        await (await send('PATCH', `/categories/${id}`, { name: 'Feira' })).json(),
      );

      expect(dto.archivedAt).toBe(NOW);
    });

    it('refuses the name of another category of the same kind', async () => {
      const id = await idOf('Mercado');

      await expectError(
        await send('PATCH', `/categories/${id}`, { name: 'restaurantes' }),
        409,
        'CATEGORY_NAME_TAKEN',
      );
    });

    it('refuses to change the kind, an unknown key and an empty body', async () => {
      const id = await idOf('Mercado');

      for (const body of [{ kind: 'income' }, { name: 'X', color: 'red' }, {}]) {
        await expectError(await send('PATCH', `/categories/${id}`, body), 400, 'VALIDATION_FAILED');
      }
    });

    it('answers 404 for a category that does not exist and 400 for an id that is not a UUID', async () => {
      await expectError(
        await send('PATCH', `/categories/${generateId()}`, { name: 'X' }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await send('PATCH', '/categories/nope', { name: 'X' }),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('archive and unarchive', () => {
    it('archives, keeping the transactions in the category, and brings it back', async () => {
      const id = await idOf('Mercado');
      const accountId = await insertTestAccount(database.db);
      await insertTestTransaction(database.db, accountId, {
        category_id: id,
        category_source: 'user',
      });

      const archived = categoryDtoSchema.parse(
        await (await send('POST', `/categories/${id}/archive`)).json(),
      );
      expect(archived).toMatchObject({ archivedAt: NOW, transactionCount: 1 });
      expect((await list()).map((item) => item.id)).not.toContain(id);
      expect((await list('?status=archived')).map((item) => item.id)).toEqual([id]);

      const back = categoryDtoSchema.parse(
        await (await send('POST', `/categories/${id}/unarchive`)).json(),
      );
      expect(back.archivedAt).toBeNull();
      expect((await list()).map((item) => item.id)).toContain(id);
    });

    it('refuses to archive twice and to unarchive what is not archived', async () => {
      const id = await idOf('Mercado');

      await expectError(
        await send('POST', `/categories/${id}/unarchive`),
        409,
        'CATEGORY_NOT_ARCHIVED',
      );
      await send('POST', `/categories/${id}/archive`);
      await expectError(
        await send('POST', `/categories/${id}/archive`),
        409,
        'CATEGORY_ALREADY_ARCHIVED',
      );
    });

    it('answers 404 and 400', async () => {
      for (const action of ['archive', 'unarchive']) {
        await expectError(
          await send('POST', `/categories/${generateId()}/${action}`),
          404,
          'CATEGORY_NOT_FOUND',
        );
        await expectError(
          await send('POST', `/categories/nope/${action}`),
          400,
          'VALIDATION_FAILED',
        );
      }
    });
  });

  it('has no route to delete a category (BR-CAT-002)', async () => {
    const id = await idOf('Mercado');

    await expectError(await send('DELETE', `/categories/${id}`), 404, 'ROUTE_NOT_FOUND');
    expect(await list()).toHaveLength(30);
  });

  it('answers 401 on every route without the local token', async () => {
    const id = generateId();
    for (const [method, path] of [
      ['GET', '/categories'],
      ['POST', '/categories'],
      ['PATCH', `/categories/${id}`],
      ['POST', `/categories/${id}/archive`],
      ['POST', `/categories/${id}/unarchive`],
    ] as const) {
      const response = await app.request(path, {
        method,
        headers: { 'x-fincheck-token': 'wrong' },
      });

      await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
    }
  });
});

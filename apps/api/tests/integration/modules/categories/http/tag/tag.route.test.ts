import { tagDtoSchema } from '@fincheck/shared/categories/tag/tag.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const listSchema = listResponseSchema(tagDtoSchema);

describe('tags routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let categoryId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    categoryId = await insertTestCategory(database.db, { name: 'Categoria A' });
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
    const response = await send('GET', `/tags${query}`);
    expect(response.status).toBe(200);

    return listSchema.parse(await response.json()).items;
  };

  const create = async (name: string, inCategory = categoryId) => {
    const response = await send('POST', '/tags', { categoryId: inCategory, name });
    expect(response.status).toBe(201);

    return tagDtoSchema.parse(await response.json());
  };

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  describe('GET /tags', () => {
    it('is empty at first', async () => {
      expect(await list()).toEqual([]);
    });

    it('lists the active ones by name with no difference for accent, and the archived on request', async () => {
      await create('viagem');
      await create('Árvore');
      const old = await create('antiga');
      await send('POST', `/tags/${old.id}/archive`);
      await create('zebra');

      expect((await list()).map((tag) => tag.name)).toEqual(['Árvore', 'viagem', 'zebra']);
      expect((await list('?includeArchived=true')).map((tag) => tag.name)).toEqual([
        'antiga',
        'Árvore',
        'viagem',
        'zebra',
      ]);
      expect((await list('?includeArchived=false')).map((tag) => tag.name)).toEqual([
        'Árvore',
        'viagem',
        'zebra',
      ]);
    });

    it('filters by category and shows the category of each tag', async () => {
      const other = await insertTestCategory(database.db, { name: 'Categoria B' });
      await create('viagem');
      await create('obra', other);

      const inTrip = await list(`?categoryId=${categoryId}`);
      expect(inTrip.map((tag) => [tag.name, tag.categoryId])).toEqual([['viagem', categoryId]]);
      expect((await list()).map((tag) => tag.categoryId).sort()).toEqual(
        [categoryId, other].sort(),
      );
      expect(await list(`?categoryId=${generateId()}`)).toEqual([]);
    });

    it('counts the transactions with the tag, the ignored ones too', async () => {
      const trip = await create('viagem');
      const accountId = await insertTestAccount(database.db);
      for (const overrides of [{}, { ignored_at: NOW }]) {
        const transactionId = await insertTestTransaction(database.db, accountId, overrides);
        await database.db
          .insertInto('transaction_tags')
          .values({ transaction_id: transactionId, tag_id: trip.id })
          .execute();
      }

      expect((await list()).find((tag) => tag.id === trip.id)?.transactionCount).toBe(2);
    });

    it('refuses a flag that is not true or false', async () => {
      await expectError(await send('GET', '/tags?includeArchived=maybe'), 400, 'VALIDATION_FAILED');
    });
  });

  describe('POST /tags', () => {
    it('creates a tag, trimmed, active and unused', async () => {
      const dto = await create('  viagem  ');

      expect(dto).toEqual({
        id: dto.id,
        categoryId,
        name: 'viagem',
        archivedAt: null,
        transactionCount: 0,
      });
    });

    it('refuses a name already taken in the category, whatever the case or the accent, archived or not', async () => {
      const tag = await create('Promoção');
      await send('POST', `/tags/${tag.id}/archive`);

      for (const name of ['promoção', 'PROMOCAO', ' promocao ']) {
        await expectError(await send('POST', '/tags', { categoryId, name }), 409, 'TAG_NAME_TAKEN');
      }
    });

    it('lets two categories have a tag of the same name', async () => {
      const other = await insertTestCategory(database.db, { name: 'Categoria B' });
      await create('Promoção');

      const second = await create('promoção', other);

      expect(second.categoryId).toBe(other);
    });

    it('answers 404 for a category that does not exist and 422 for an archived one', async () => {
      await expectError(
        await send('POST', '/tags', { categoryId: generateId(), name: 'x' }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      const archived = await insertTestCategory(database.db, {
        name: 'Categoria velha',
        archived_at: NOW,
      });

      await expectError(
        await send('POST', '/tags', { categoryId: archived, name: 'x' }),
        422,
        'TAG_CATEGORY_ARCHIVED',
      );
    });

    it('refuses what the schema refuses, a tag with no category included', async () => {
      for (const body of [
        {},
        { name: 'sem categoria' },
        { categoryId, name: '' },
        { categoryId, name: '   ' },
        { categoryId, name: 'x'.repeat(31) },
        { categoryId: 'nope', name: 'x' },
      ]) {
        await expectError(await send('POST', '/tags', body), 400, 'VALIDATION_FAILED');
      }
      expect(await list()).toEqual([]);
    });
  });

  describe('PATCH /tags/:id', () => {
    it('renames, and the transactions keep the tag', async () => {
      const tag = await create('viagem');
      const accountId = await insertTestAccount(database.db);
      const transactionId = await insertTestTransaction(database.db, accountId);
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: transactionId, tag_id: tag.id })
        .execute();

      const response = await send('PATCH', `/tags/${tag.id}`, { name: 'férias' });

      expect(tagDtoSchema.parse(await response.json())).toMatchObject({
        id: tag.id,
        name: 'férias',
        transactionCount: 1,
      });
    });

    it('keeps the category on a rename, even if the body carries another one', async () => {
      const tag = await create('viagem');
      const other = await insertTestCategory(database.db, { name: 'Categoria B' });

      const response = await send('PATCH', `/tags/${tag.id}`, {
        name: 'férias',
        categoryId: other,
      });

      expect(tagDtoSchema.parse(await response.json()).categoryId).toBe(categoryId);
    });

    it('lets another category use the name a tag is renamed to', async () => {
      const other = await insertTestCategory(database.db, { name: 'Categoria B' });
      await create('obra', other);
      const tag = await create('viagem');

      const response = await send('PATCH', `/tags/${tag.id}`, { name: 'obra' });

      expect(response.status).toBe(200);
    });

    it('lets a tag change only the case of its own name, and refuses another tag name of its category', async () => {
      const tag = await create('viagem');
      await create('trabalho');

      const same = await send('PATCH', `/tags/${tag.id}`, { name: 'VIAGEM' });
      expect(same.status).toBe(200);
      await expectError(
        await send('PATCH', `/tags/${tag.id}`, { name: 'Trabalho' }),
        409,
        'TAG_NAME_TAKEN',
      );
    });

    it('answers 404, 400 and refuses an empty name', async () => {
      const tag = await create('viagem');

      await expectError(
        await send('PATCH', `/tags/${generateId()}`, { name: 'X' }),
        404,
        'TAG_NOT_FOUND',
      );
      await expectError(await send('PATCH', '/tags/nope', { name: 'X' }), 400, 'VALIDATION_FAILED');
      await expectError(
        await send('PATCH', `/tags/${tag.id}`, { name: '' }),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('archive and unarchive', () => {
    it('archives and brings back', async () => {
      const tag = await create('viagem');

      const archived = tagDtoSchema.parse(
        await (await send('POST', `/tags/${tag.id}/archive`)).json(),
      );
      expect(archived.archivedAt).toBe(NOW);
      expect(await list()).toEqual([]);

      const back = tagDtoSchema.parse(
        await (await send('POST', `/tags/${tag.id}/unarchive`)).json(),
      );
      expect(back.archivedAt).toBeNull();
      expect(await list()).toHaveLength(1);
    });

    it('refuses to archive twice and to unarchive an active one', async () => {
      const tag = await create('viagem');

      await expectError(await send('POST', `/tags/${tag.id}/unarchive`), 409, 'TAG_NOT_ARCHIVED');
      await send('POST', `/tags/${tag.id}/archive`);
      await expectError(await send('POST', `/tags/${tag.id}/archive`), 409, 'TAG_ALREADY_ARCHIVED');
    });

    it('answers 404 and 400', async () => {
      for (const action of ['archive', 'unarchive']) {
        await expectError(
          await send('POST', `/tags/${generateId()}/${action}`),
          404,
          'TAG_NOT_FOUND',
        );
        await expectError(await send('POST', `/tags/nope/${action}`), 400, 'VALIDATION_FAILED');
      }
    });
  });

  it('has no route to delete a tag', async () => {
    const tag = await create('viagem');

    await expectError(await send('DELETE', `/tags/${tag.id}`), 404, 'ROUTE_NOT_FOUND');
  });

  it('answers 401 on every route without the local token', async () => {
    const id = generateId();
    for (const [method, path] of [
      ['GET', '/tags'],
      ['POST', '/tags'],
      ['PATCH', `/tags/${id}`],
      ['POST', `/tags/${id}/archive`],
      ['POST', `/tags/${id}/unarchive`],
    ] as const) {
      const response = await app.request(path, {
        method,
        headers: { 'x-fincheck-token': 'wrong' },
      });

      await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
    }
  });
});

import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';

// The app `main` builds (`createApp`), not the test app of one module: it fails when a reader of
// another context is left unplugged. Before `categories` existed, a request with a category or a
// tag was refused with a 400 and `bulk` answered 404; the 400 is easy to take for a form error.
describe('createApp wires categories into transactions', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let accountId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    accountId = await insertTestAccount(database.db);
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

  const newExpense = (extra: Record<string, unknown> = {}) =>
    send('POST', '/transactions', {
      type: 'expense',
      accountId,
      method: 'pix',
      description: 'Uber *Trip',
      amountCents: 2500,
      occurredOn: '2026-11-05',
      ...extra,
    });

  it('creates a transaction with a category: 201', async () => {
    const categoryId = await insertTestCategory(database.db);

    const response = await newExpense({ categoryId });

    expect(response.status).toBe(201);
    expect(transactionDtoSchema.parse(await response.json())).toMatchObject({
      categoryId,
      categorySource: 'user',
    });
  });

  it('creates a transaction with tags: 201', async () => {
    const tagId = await insertTestTag(database.db);

    const response = await newExpense({ tagIds: [tagId] });

    expect(response.status).toBe(201);
    expect(transactionDtoSchema.parse(await response.json()).tagIds).toEqual([tagId]);
  });

  it('creates a transaction with the category and the tags of the ready-made list', async () => {
    const list = await (await send('GET', '/categories')).json();
    const restaurantes = (list as { items: { id: string; name: string }[] }).items.find(
      (item) => item.name === 'Restaurantes',
    );

    const response = await newExpense({ categoryId: restaurantes?.id });

    expect(response.status).toBe(201);
  });

  it('answers the contract errors of the owner for a category or tag that does not exist', async () => {
    const missing = '01939000-0000-7000-8000-00000000dead';

    const category = await newExpense({ categoryId: missing });
    const tag = await newExpense({ tagIds: [missing] });

    expect(category.status).toBe(404);
    expect(apiErrorSchema.parse(await category.json()).code).toBe('CATEGORY_NOT_FOUND');
    expect(tag.status).toBe(404);
    expect(apiErrorSchema.parse(await tag.json()).code).toBe('TAG_NOT_FOUND');
  });

  it('mounts POST /transactions/bulk and its Desfazer: they answer, they are not 404', async () => {
    const categoryId = await insertTestCategory(database.db);
    const first = transactionDtoSchema.parse(await (await newExpense()).json());
    const second = transactionDtoSchema.parse(await (await newExpense()).json());

    const bulk = await send('POST', '/transactions/bulk', {
      transactionIds: [first.id, second.id],
      action: { type: 'categorize', categoryId },
    });

    expect(bulk.status).toBe(200);
    const result = bulkTransactionsResultSchema.parse(await bulk.json());
    expect(result.updatedCount).toBe(2);

    const restore = await send('POST', '/transactions/bulk/restore', { items: result.previous });
    expect(restore.status).toBe(200);
    expect(restoreBulkResultSchema.parse(await restore.json())).toEqual({ restoredCount: 2 });
    const back = transactionDtoSchema.parse(
      await (await send('GET', `/transactions/${first.id}`)).json(),
    );
    expect(back.categoryId).toBeNull();
  });

  describe('POST /transactions/bulk/restore refuses a state that does not hold', () => {
    const stateOf = (transactionId: string, overrides: Record<string, unknown>) => ({
      transactionId,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      tagIds: [],
      ignoredAt: null,
      ...overrides,
    });
    const restore = (item: Record<string, unknown>) =>
      send('POST', '/transactions/bulk/restore', { items: [item] });
    const codeOf = async (response: Response) => apiErrorSchema.parse(await response.json()).code;
    const MISSING = '01939000-0000-7000-8000-00000000dead';

    it('answers 404 for a category or a tag that does not exist, never 500, and writes nothing', async () => {
      const first = transactionDtoSchema.parse(await (await newExpense()).json());

      const category = await restore(
        stateOf(first.id, { categoryId: MISSING, categorySource: 'user' }),
      );
      const tag = await restore(stateOf(first.id, { tagIds: [MISSING] }));

      expect(category.status).toBe(404);
      expect(await codeOf(category)).toBe('CATEGORY_NOT_FOUND');
      expect(tag.status).toBe(404);
      expect(await codeOf(tag)).toBe('TAG_NOT_FOUND');
    });

    it('answers 400 for a category of the other kind and for a category with no origin', async () => {
      const first = transactionDtoSchema.parse(await (await newExpense()).json());
      const income = await insertTestCategory(database.db, {
        kind: 'income',
        name: 'Receita teste',
      });
      const expense = await insertTestCategory(database.db);

      const wrongKind = await restore(
        stateOf(first.id, { categoryId: income, categorySource: 'user' }),
      );
      const noOrigin = await restore(
        stateOf(first.id, { categoryId: expense, categorySource: null }),
      );

      expect(wrongKind.status).toBe(400);
      expect(await codeOf(wrongKind)).toBe('VALIDATION_FAILED');
      expect(noOrigin.status).toBe(400);
      expect(await codeOf(noOrigin)).toBe('VALIDATION_FAILED');
      const unchanged = transactionDtoSchema.parse(
        await (await send('GET', `/transactions/${first.id}`)).json(),
      );
      expect(unchanged.categoryId).toBeNull();
    });

    it('refuses an empty list (the contract asks for 1 to 500)', async () => {
      const response = await send('POST', '/transactions/bulk/restore', { items: [] });

      expect(response.status).toBe(400);
      expect(await codeOf(response)).toBe('VALIDATION_FAILED');
    });

    it('still restores a valid state', async () => {
      const first = transactionDtoSchema.parse(await (await newExpense()).json());
      const category = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db);

      const response = await restore(
        stateOf(first.id, { categoryId: category, categorySource: 'user', tagIds: [tag] }),
      );

      expect(response.status).toBe(200);
      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 1 });
    });
  });

  it('adds a tag in bulk through the real reader', async () => {
    const tagId = await insertTestTag(database.db);
    const first = transactionDtoSchema.parse(await (await newExpense()).json());

    const bulk = await send('POST', '/transactions/bulk', {
      transactionIds: [first.id],
      action: { type: 'addTag', tagId },
    });

    expect(bulk.status).toBe(200);
    expect(bulkTransactionsResultSchema.parse(await bulk.json()).updatedCount).toBe(1);
  });

  it('brings the suggestions of category into the review queue', async () => {
    const transport = await insertTestCategory(database.db, { name: 'Transporte teste' });
    const history = [
      transactionDtoSchema.parse(await (await newExpense()).json()),
      transactionDtoSchema.parse(await (await newExpense()).json()),
    ];
    await send('POST', '/transactions/bulk', {
      transactionIds: history.map((item) => item.id),
      action: { type: 'categorize', categoryId: transport },
    });
    const waiting = transactionDtoSchema.parse(await (await newExpense()).json());

    const response = await send('GET', '/transactions/review-queue');

    expect(response.status).toBe(200);
    const queue = reviewQueueDtoSchema.parse(await response.json());
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.transaction.id).toBe(waiting.id);
    expect(queue.items[0]?.categorySuggestions).toEqual([
      { categoryId: transport, reason: 'history' },
    ]);
    expect(queue.items[0]?.transaction.categorySuggestion).toBe(transport);
  });

  it('mounts the routes of categories, tags, rules and suggestions', async () => {
    for (const path of ['/categories', '/tags', '/rules', '/rule-suggestions']) {
      expect((await send('GET', path)).status).toBe(200);
    }
  });
});

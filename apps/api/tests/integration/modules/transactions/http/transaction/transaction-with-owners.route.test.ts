import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { createTransactionsTestApp } from '#tests/support/transactions/transaction/create-test-transactions-app.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const ARCHIVED_AT = '2026-10-01T00:00:00.000Z';

// The module with the owners of categories, tags, invoices and rules standing in as test doubles
// that read their tables, and every route mounted: the rules that need them, end to end.
describe('transactions routes (with the owners wired)', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: Hono;
  let accountId: string;
  let cardId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    ({ app } = createTransactionsTestApp(database.db, { clock: createFixedClock(NOW) }));
    accountId = await insertTestAccount(database.db, { name: 'Nubank' });
    cardId = await insertTestCreditCard(database.db);
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

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  const dtoOf = async (response: Response, status = 200) => {
    expect(response.status).toBe(status);

    return transactionDtoSchema.parse(await response.json());
  };

  const create = async (body: Record<string, unknown>) =>
    dtoOf(
      await send('POST', '/transactions', {
        type: 'expense',
        accountId,
        method: 'pix',
        description: 'Padaria',
        amountCents: 1250,
        occurredOn: '2026-11-05',
        ...body,
      }),
      201,
    );

  const patch = (id: string, body: unknown) => send('PATCH', `/transactions/${id}`, body);

  describe('categories and tags', () => {
    it("creates with a category of the same kind, as the user's choice, and with tags", async () => {
      const food = await insertTestCategory(database.db);
      const tagA = await insertTestTag(database.db);
      const tagB = await insertTestTag(database.db);

      const dto = await create({ categoryId: food, tagIds: [tagA, tagB] });

      expect(dto).toMatchObject({
        categoryId: food,
        categorySource: 'user',
        categoryRuleId: null,
        isInReview: false,
      });
      expect([...dto.tagIds].sort()).toEqual([tagA, tagB].sort());
    });

    it('refuses a category of the other kind, an archived one and one that does not exist', async () => {
      const salary = await insertTestCategory(database.db, { kind: 'income' });
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });

      await expectError(
        await send('POST', '/transactions', body({ categoryId: salary })),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await send('POST', '/transactions', body({ categoryId: old })),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      await expectError(
        await send('POST', '/transactions', body({ categoryId: generateId() })),
        404,
        'CATEGORY_NOT_FOUND',
      );
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });

    function body(overrides: Record<string, unknown>) {
      return {
        type: 'expense',
        accountId,
        method: 'pix',
        description: 'x',
        amountCents: 100,
        occurredOn: '2026-11-05',
        ...overrides,
      };
    }

    it('refuses an archived tag and one that does not exist', async () => {
      const old = await insertTestTag(database.db, { archived_at: ARCHIVED_AT });

      await expectError(
        await send('POST', '/transactions', body({ tagIds: [old] })),
        422,
        'TRANSACTION_TAG_ARCHIVED',
      );
      await expectError(
        await send('POST', '/transactions', body({ tagIds: [generateId()] })),
        404,
        'TAG_NOT_FOUND',
      );
    });

    it('changes the category and drops the rule that had set it', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const id = await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
      });

      const dto = await dtoOf(await patch(id, { categoryId: fun }));

      expect(dto).toMatchObject({ categoryId: fun, categorySource: 'user', categoryRuleId: null });
    });

    it('refuses a category on a transaction outside the account, of the other kind or archived', async () => {
      const food = await insertTestCategory(database.db);
      const salary = await insertTestCategory(database.db, { kind: 'income' });
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });
      const transfer = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });
      const expense = await insertTestTransaction(database.db, accountId);

      await expectError(
        await patch(transfer, { categoryId: food }),
        422,
        'TRANSACTION_CATEGORY_NOT_ALLOWED',
      );
      await expectError(
        await patch(expense, { categoryId: salary }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await patch(expense, { categoryId: old }),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      await expectError(
        await patch(expense, { categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
    });

    it('takes the category off when it becomes a transfer, in the same request', async () => {
      const food = await insertTestCategory(database.db);
      const id = await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
      });

      const dto = await dtoOf(await patch(id, { nature: 'transfer' }));

      expect(dto).toMatchObject({ nature: 'transfer', categoryId: null, categorySource: null });
      await expectError(
        await patch(await insertTestTransaction(database.db, accountId), {
          nature: 'transfer',
          categoryId: food,
        }),
        422,
        'TRANSACTION_CATEGORY_NOT_ALLOWED',
      );
    });

    it('replaces the tags, letting an archived one that was there stay and refusing a new archived one', async () => {
      const old = await insertTestTag(database.db, { archived_at: ARCHIVED_AT });
      const fresh = await insertTestTag(database.db);
      const archivedNew = await insertTestTag(database.db, { archived_at: ARCHIVED_AT });
      const id = await insertTestTransaction(database.db, accountId);
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: id, tag_id: old })
        .execute();

      const dto = await dtoOf(await patch(id, { tagIds: [old, fresh] }));
      expect([...dto.tagIds].sort()).toEqual([old, fresh].sort());

      await expectError(
        await patch(id, { tagIds: [old, archivedNew] }),
        422,
        'TRANSACTION_TAG_ARCHIVED',
      );
      await expectError(await patch(id, { tagIds: [generateId()] }), 404, 'TAG_NOT_FOUND');
      expect((await dtoOf(await send('GET', `/transactions/${id}`))).tagIds).toHaveLength(2);
    });

    it('splits with a category in each part, which leaves the review and filters by part', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const { id } = await create({ amountCents: 5000 });

      const dto = await dtoOf(
        await send('PUT', `/transactions/${id}/splits`, {
          parts: [
            { amountCents: 3000, categoryId: food },
            { amountCents: 2000, categoryId: fun },
          ],
        }),
      );
      const filtered = await send('GET', `/transactions?categoryId=${fun}`);

      expect(dto.splits.map((part) => [part.categoryId, part.amountCents])).toEqual([
        [food, -3000],
        [fun, -2000],
      ]);
      expect(dto).toMatchObject({ categoryId: null, isInReview: false });
      expect(
        ((await filtered.json()) as { items: { id: string }[] }).items.map((i) => i.id),
      ).toEqual([id]);
    });

    it('checks the category of the parts: kind, archived, unknown', async () => {
      const salary = await insertTestCategory(database.db, { kind: 'income' });
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });
      const { id } = await create({});
      const parts = (categoryId: string) => ({
        parts: [{ amountCents: 1000, categoryId }, { amountCents: 250 }],
      });

      await expectError(
        await send('PUT', `/transactions/${id}/splits`, parts(salary)),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await send('PUT', `/transactions/${id}/splits`, parts(old)),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      await expectError(
        await send('PUT', `/transactions/${id}/splits`, parts(generateId())),
        404,
        'CATEGORY_NOT_FOUND',
      );
    });
  });

  describe('card purchases and the invoice', () => {
    it('asks invoices for the month: until the closing day it is the month, after it the next', async () => {
      const beforeClosing = await create({
        accountId: cardId,
        method: 'credit',
        occurredOn: '2026-11-05',
      });
      const afterClosing = await create({
        accountId: cardId,
        method: 'credit',
        occurredOn: '2026-11-06',
      });

      expect(beforeClosing).toMatchObject({ invoiceMonth: '2026-11', competenceOn: '2026-11-05' });
      expect(afterClosing).toMatchObject({ invoiceMonth: '2026-12', competenceOn: '2026-11-06' });
    });

    it('refuses income on a card, created with credit', async () => {
      await expectError(
        await send('POST', '/transactions', {
          type: 'income',
          accountId: cardId,
          method: 'credit',
          description: 'Estorno',
          amountCents: 1500,
          occurredOn: '2026-11-05',
        }),
        400,
        'VALIDATION_FAILED',
      );
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });

    it('moves the invoice when the date of the purchase moves, and restores it with the original', async () => {
      const id = await insertTestTransaction(database.db, cardId, {
        origin: 'bank',
        method: 'credit',
        description: 'MERCADO',
        bank_description: 'MERCADO',
        bank_amount_cents: -1250,
        bank_occurred_on: '2026-11-05',
        bank_status: 'posted',
        invoice_month: '2026-11',
        search_text: 'MERCADO',
      });

      const moved = await dtoOf(await patch(id, { occurredOn: '2026-11-20' }));
      expect(moved).toMatchObject({ occurredOn: '2026-11-20', invoiceMonth: '2026-12' });

      const restored = await dtoOf(await send('POST', `/transactions/${id}/restore-original`));
      expect(restored).toMatchObject({ occurredOn: '2026-11-05', invoiceMonth: '2026-11' });
    });

    it('keeps the invoice of a parcel when its date moves (N6)', async () => {
      const plan = await insertTestInstallmentPlan(database.db, cardId);
      const id = await insertTestTransaction(database.db, cardId, {
        method: 'credit',
        invoice_month: '2026-11',
        installment_plan_id: plan,
        installment_number: 1,
      });

      const dto = await dtoOf(await patch(id, { occurredOn: '2026-11-20' }));

      expect(dto.invoiceMonth).toBe('2026-11');
    });
  });

  describe('links to other contexts', () => {
    it('shows the links of a transaction and locks the nature of a paid invoice', async () => {
      const payment = await insertTestTransaction(database.db, accountId, {
        nature: 'invoice_payment',
        amount_cents: -50000,
      });
      const free = await insertTestTransaction(database.db, accountId, {
        nature: 'invoice_payment',
        amount_cents: -50000,
      });
      const linked = createTransactionsTestApp(database.db, {
        clock: createFixedClock(NOW),
        readers: {
          links: {
            async linksOf(ids) {
              return new Map(
                ids.includes(payment)
                  ? [
                      [
                        payment,
                        {
                          occurrence: null,
                          bill: null,
                          invoicePayment: { accountId: cardId, month: '2026-10' },
                        },
                      ],
                    ]
                  : [],
              );
            },
          },
        },
      }).app;
      const request = (method: string, path: string, requestBody?: unknown) =>
        linked.request(path, {
          method,
          ...(requestBody === undefined
            ? {}
            : {
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(requestBody),
              }),
        });

      const detail = await dtoOf(await request('GET', `/transactions/${payment}`));
      expect(detail.links.invoicePayment).toEqual({ accountId: cardId, month: '2026-10' });
      await expectError(
        await request('PATCH', `/transactions/${payment}`, { nature: 'transfer' }),
        422,
        'TRANSACTION_NATURE_LOCKED',
      );
      // Without a link (a detection that got it wrong) it may change.
      const changed = await dtoOf(
        await request('PATCH', `/transactions/${free}`, { nature: 'transfer' }),
      );
      expect(changed.nature).toBe('transfer');
    });
  });

  describe('review queue with suggestions and candidates', () => {
    it('brings the suggestions of the owner and the first one on the transaction', async () => {
      const food = await insertTestCategory(database.db);
      const id = await insertTestTransaction(database.db, accountId, {
        description: 'iFood *Burger 03/10',
        search_text: 'IFOOD *BURGER 03/10',
      });
      const withReaders = createTransactionsTestApp(database.db, {
        clock: createFixedClock(NOW),
        readers: {
          categorySuggestions: {
            async suggestionsFor(items) {
              return new Map(
                items.map((item) => [
                  item.transactionId,
                  [
                    { categoryId: food, reason: 'history' as const },
                    { categoryId: food, reason: 'rule' as const },
                  ],
                ]),
              );
            },
          },
          recurrenceCandidates: {
            async candidatesFor(items) {
              return new Map(
                items.map((item) => [
                  item.transactionId,
                  [
                    {
                      occurrenceId: generateId(),
                      recurrenceId: generateId(),
                      recurrenceName: 'Vale refeição',
                      month: '2026-11',
                      expectedAmountCents: 80000,
                      remainingCents: 80000,
                    },
                  ],
                ]),
              );
            },
          },
        },
      }).app;

      const queue = reviewQueueDtoSchema.parse(
        await (await withReaders.request('/transactions/review-queue')).json(),
      );
      const detail = await dtoOf(await withReaders.request(`/transactions/${id}`));

      expect(queue.items[0]).toMatchObject({
        rulePattern: 'IFOOD *BURGER',
        categorySuggestions: [
          { categoryId: food, reason: 'history' },
          { categoryId: food, reason: 'rule' },
        ],
        recurrenceCandidates: [{ recurrenceName: 'Vale refeição' }],
      });
      expect(queue.items[0]?.transaction.categorySuggestion).toBe(food);
      expect(detail.categorySuggestion).toBe(food);
    });
  });

  describe('POST /transactions/bulk', () => {
    const bulk = async (transactionIds: string[], action: unknown) => {
      const response = await send('POST', '/transactions/bulk', { transactionIds, action });
      expect(response.status).toBe(200);

      return bulkTransactionsResultSchema.parse(await response.json());
    };

    it('categorizes what can be, skips the rest with the reason and returns the state before', async () => {
      const food = await insertTestCategory(database.db);
      const salary = await insertTestCategory(database.db, { kind: 'income' });
      const plain = await insertTestTransaction(database.db, accountId);
      const already = await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
      });
      const byRule = await insertTestTransaction(database.db, accountId, {
        category_id: salary,
        category_source: 'rule',
        nature: 'income',
        amount_cents: 500,
      });
      const outside = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });
      const divided = (await create({})).id;
      await send('PUT', `/transactions/${divided}/splits`, {
        parts: [{ amountCents: 1000 }, { amountCents: 250 }],
      });
      const unknown = generateId();

      const result = await bulk([plain, already, byRule, outside, divided, unknown], {
        type: 'categorize',
        categoryId: food,
      });

      expect(result.updatedCount).toBe(1);
      expect(result.skipped).toEqual([
        { transactionId: already, reason: 'no_change' },
        { transactionId: byRule, reason: 'category_kind_mismatch' },
        { transactionId: outside, reason: 'outside_account' },
        { transactionId: divided, reason: 'split' },
        { transactionId: unknown, reason: 'not_found' },
      ]);
      expect(result.previous).toEqual([
        {
          transactionId: plain,
          categoryId: null,
          categorySource: null,
          categoryRuleId: null,
          tagIds: [],
          ignoredAt: null,
        },
      ]);
      expect((await dtoOf(await send('GET', `/transactions/${plain}`))).categoryId).toBe(food);
    });

    it('adds a tag to the ones that do not have it and keeps the others', async () => {
      const tag = await insertTestTag(database.db);
      const other = await insertTestTag(database.db);
      const plain = await insertTestTransaction(database.db, accountId);
      const tagged = await insertTestTransaction(database.db, accountId);
      await database.db
        .insertInto('transaction_tags')
        .values([
          { transaction_id: tagged, tag_id: tag },
          { transaction_id: plain, tag_id: other },
        ])
        .execute();
      const fresh = await insertTestTransaction(database.db, accountId);

      const result = await bulk([plain, tagged, fresh], { type: 'addTag', tagId: tag });

      expect(result.updatedCount).toBe(2);
      expect(result.skipped).toEqual([{ transactionId: tagged, reason: 'no_change' }]);
      expect([...(await dtoOf(await send('GET', `/transactions/${plain}`))).tagIds].sort()).toEqual(
        [tag, other].sort(),
      );
    });

    it('ignores, skipping the ones already ignored', async () => {
      const first = await insertTestTransaction(database.db, accountId);
      const second = await insertTestTransaction(database.db, accountId, { ignored_at: NOW });

      const result = await bulk([first, second], { type: 'ignore' });

      expect(result.updatedCount).toBe(1);
      expect(result.skipped).toEqual([{ transactionId: second, reason: 'no_change' }]);
      expect((await dtoOf(await send('GET', `/transactions/${first}`))).ignoredAt).toBe(NOW);
    });

    it('refuses an archived category or tag and a category or tag that does not exist, changing nothing', async () => {
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });
      const oldTag = await insertTestTag(database.db, { archived_at: ARCHIVED_AT });
      const id = await insertTestTransaction(database.db, accountId);
      const request = (action: unknown) =>
        send('POST', '/transactions/bulk', { transactionIds: [id], action });

      await expectError(
        await request({ type: 'categorize', categoryId: old }),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      await expectError(
        await request({ type: 'addTag', tagId: oldTag }),
        422,
        'TRANSACTION_TAG_ARCHIVED',
      );
      await expectError(
        await request({ type: 'categorize', categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await request({ type: 'addTag', tagId: generateId() }),
        404,
        'TAG_NOT_FOUND',
      );
      expect((await dtoOf(await send('GET', `/transactions/${id}`))).categoryId).toBeNull();
    });

    it('validates the request: no ids, repeated ids, more than 500, unknown action', async () => {
      const id = generateId();
      for (const wrong of [
        { transactionIds: [], action: { type: 'ignore' } },
        { transactionIds: [id, id], action: { type: 'ignore' } },
        {
          transactionIds: Array.from({ length: 501 }, () => generateId()),
          action: { type: 'ignore' },
        },
        { transactionIds: [id], action: { type: 'delete' } },
      ]) {
        await expectError(
          await send('POST', '/transactions/bulk', wrong),
          400,
          'VALIDATION_FAILED',
        );
      }
    });

    it('undoes: writes back category, source, rule, tags and ignore, and skips what vanished', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db);
      const id = await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
      });
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: id, tag_id: tag })
        .execute();
      await bulk([id], { type: 'ignore' });
      await send('PATCH', `/transactions/${id}`, { categoryId: null, tagIds: [] });

      const response = await send('POST', '/transactions/bulk/restore', {
        items: [
          {
            transactionId: id,
            categoryId: food,
            categorySource: 'user',
            categoryRuleId: null,
            tagIds: [tag],
            ignoredAt: null,
          },
          {
            transactionId: generateId(),
            categoryId: null,
            categorySource: null,
            categoryRuleId: null,
            tagIds: [],
            ignoredAt: null,
          },
        ],
      });

      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 1 });
      expect(await dtoOf(await send('GET', `/transactions/${id}`))).toMatchObject({
        categoryId: food,
        categorySource: 'user',
        tagIds: [tag],
        ignoredAt: null,
      });
    });

    it('restores without breaking when the nature changed since the action', async () => {
      const food = await insertTestCategory(database.db);
      const id = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });

      const response = await send('POST', '/transactions/bulk/restore', {
        items: [
          {
            transactionId: id,
            categoryId: food,
            categorySource: 'user',
            categoryRuleId: null,
            tagIds: [],
            ignoredAt: null,
          },
        ],
      });

      expect(response.status).toBe(200);
      expect((await dtoOf(await send('GET', `/transactions/${id}`))).categoryId).toBeNull();
    });

    it('keeps the id of a rule that still exists and leaves none of one that was deleted', async () => {
      const food = await insertTestCategory(database.db);
      const alive = generateId();
      await database.db
        .insertInto('category_rules')
        .values({
          id: alive,
          description_contains: 'MERCADO',
          counterparty_contains: null,
          kind: null,
          account_id: null,
          amount_min_cents: null,
          amount_max_cents: null,
          category_id: food,
          enabled: 1,
          created_at: NOW,
          updated_at: NOW,
        })
        .execute();
      const first = await insertTestTransaction(database.db, accountId);
      const second = await insertTestTransaction(database.db, accountId);
      const state = (transactionId: string, ruleId: string) => ({
        transactionId,
        categoryId: food,
        categorySource: 'rule',
        categoryRuleId: ruleId,
        tagIds: [],
        ignoredAt: null,
      });

      await send('POST', '/transactions/bulk/restore', {
        items: [state(first, alive), state(second, generateId())],
      });

      expect((await dtoOf(await send('GET', `/transactions/${first}`))).categoryRuleId).toBe(alive);
      expect((await dtoOf(await send('GET', `/transactions/${second}`))).categoryRuleId).toBeNull();
    });
  });

  describe('installment plans', () => {
    const planBody = (overrides: Record<string, unknown> = {}) => ({
      accountId: cardId,
      description: 'Cadeira ergonômica',
      totalCents: 129900,
      installmentCount: 12,
      firstInvoiceMonth: '2026-11',
      purchaseOn: '2026-10-31',
      ...overrides,
    });

    const createPlan = async (overrides: Record<string, unknown> = {}) => {
      const response = await send('POST', '/installment-plans', planBody(overrides));
      expect(response.status).toBe(201);

      return installmentPlanDtoSchema.parse(await response.json());
    };

    it('creates the plan and one transaction per parcel, the first taking the leftover cents', async () => {
      const plan = await createPlan();

      expect(plan).toMatchObject({
        accountId: cardId,
        origin: 'manual',
        totalCents: 129900,
        installmentCount: 12,
        firstInvoiceMonth: '2026-11',
        purchaseOn: '2026-10-31',
        categoryId: null,
      });
      expect(plan.installments).toHaveLength(12);
      expect(plan.installments.map((item) => item.amountCents)).toEqual([
        10825, 10825, 10825, 10825, 10825, 10825, 10825, 10825, 10825, 10825, 10825, 10825,
      ]);
      expect(plan.installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(129900);

      const rows = await database.db
        .selectFrom('transactions')
        .select([
          'nature',
          'nature_set_by',
          'method',
          'origin',
          'amount_cents',
          'invoice_month',
          'occurred_on',
          'installment_number',
          'description',
        ])
        .where('installment_plan_id', '=', plan.id)
        .orderBy('installment_number')
        .execute();
      expect(rows).toHaveLength(12);
      expect(rows[0]).toEqual({
        nature: 'expense',
        nature_set_by: 'user',
        method: 'credit',
        origin: 'manual',
        amount_cents: -10825,
        invoice_month: '2026-11',
        occurred_on: '2026-11-30',
        installment_number: 1,
        description: 'Cadeira ergonômica',
      });
      // The 31st does not exist in February or in a 30-day month: held at the end of the month.
      expect(rows.map((row) => row.invoice_month).slice(0, 5)).toEqual([
        '2026-11',
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
      ]);
      expect(rows.map((row) => row.occurred_on).slice(0, 5)).toEqual([
        '2026-11-30',
        '2026-12-31',
        '2027-01-31',
        '2027-02-28',
        '2027-03-31',
      ]);
    });

    it('gives the leftover cents to the first parcel', async () => {
      const plan = await createPlan({ totalCents: 10000, installmentCount: 3 });

      expect(plan.installments.map((item) => item.amountCents)).toEqual([3334, 3333, 3333]);
    });

    it('counts each parcel as spending in the month of its invoice and lists them as installments', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const december = await send('GET', '/transactions?month=2026-12');
      const items = ((await december.json()) as { items: unknown[] }).items.map((item) =>
        transactionDtoSchema.parse(item),
      );

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        amountCents: -10000,
        invoiceMonth: '2026-12',
        competenceOn: '2026-12-31',
        installment: { planId: plan.id, number: 2, count: 3 },
        nature: 'expense',
      });
      const summary = await send('GET', '/transactions/summary?month=2026-12');
      expect(((await summary.json()) as { expensesCents: number }).expensesCents).toBe(10000);
    });

    it('gives the category and the tags to every parcel, and the next parcel and what is left from the open invoice on', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db);
      const plan = await createPlan({
        totalCents: 40000,
        installmentCount: 4,
        firstInvoiceMonth: '2026-09',
        categoryId: food,
        tagIds: [tag, tag],
      });

      // The open invoice is 2026-11: parcels 3 and 4 are left.
      expect(plan.categoryId).toBe(food);
      expect(plan.nextInstallment).toEqual({
        number: 3,
        invoiceMonth: '2026-11',
        amountCents: 10000,
      });
      expect(plan.remainingCents).toBe(20000);
      const parcel = await dtoOf(
        await send('GET', `/transactions/${plan.installments[0]?.transactionId ?? ''}`),
      );
      expect(parcel).toMatchObject({ categoryId: food, categorySource: 'user', tagIds: [tag] });
    });

    it('lists the plans of a card, active or over, by the invoice of the next parcel', async () => {
      const soon = await createPlan({
        description: 'Perto',
        firstInvoiceMonth: '2026-10',
        installmentCount: 2,
        totalCents: 3000,
      });
      const later = await createPlan({
        description: 'Longe',
        firstInvoiceMonth: '2026-12',
        installmentCount: 2,
        totalCents: 2000,
      });
      const over = await createPlan({
        description: 'Acabou',
        firstInvoiceMonth: '2026-01',
        installmentCount: 2,
        totalCents: 2000,
      });
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      await createPlan({
        accountId: otherCard,
        description: 'Do outro',
        installmentCount: 2,
        totalCents: 2000,
      });

      const list = async (query: string) => {
        const response = await send('GET', `/installment-plans${query}`);
        expect(response.status).toBe(200);

        return ((await response.json()) as { items: unknown[] }).items.map((item) =>
          installmentPlanDtoSchema.parse(item),
        );
      };

      expect((await list(`?accountId=${cardId}`)).map((plan) => plan.id)).toEqual([
        soon.id,
        later.id,
        over.id,
      ]);
      expect(
        (await list(`?accountId=${cardId}&active=true`)).map((plan) => plan.description),
      ).toEqual(['Perto', 'Longe']);
      expect((await list(`?accountId=${cardId}&active=false`)).map((plan) => plan.id)).toEqual([
        over.id,
      ]);
      expect(await list('')).toHaveLength(4);
      await expectError(
        await send('GET', `/installment-plans?accountId=${generateId()}`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });

    it('refuses an account that is not a card, an archived card and a category of income', async () => {
      const archivedCard = await insertTestCreditCard(database.db, { archived_at: ARCHIVED_AT });
      const salary = await insertTestCategory(database.db, { kind: 'income' });

      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId })),
        422,
        'INSTALLMENT_ACCOUNT_NOT_CARD',
      );
      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId: archivedCard })),
        422,
        'TRANSACTION_ACCOUNT_ARCHIVED',
      );
      await expectError(
        await send('POST', '/installment-plans', planBody({ categoryId: salary })),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId: generateId() })),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      expect(await database.db.selectFrom('installment_plans').select('id').execute()).toEqual([]);
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });

    it('refuses what the schema refuses and a total smaller than the number of parcels', async () => {
      for (const wrong of [
        { installmentCount: 1 },
        { installmentCount: 49 },
        { totalCents: 0 },
        { totalCents: 10, installmentCount: 12 },
        { firstInvoiceMonth: '2026-13' },
        { purchaseOn: '2026-02-30' },
        { description: '' },
      ]) {
        await expectError(
          await send('POST', '/installment-plans', planBody(wrong)),
          400,
          'VALIDATION_FAILED',
        );
      }
    });

    it('deletes the plan with its parcels, which stops counting', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const response = await send('DELETE', `/installment-plans/${plan.id}`);

      expect(response.status).toBe(204);
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
      const summary = await send('GET', '/transactions/summary?month=2026-12');
      expect(((await summary.json()) as { expensesCents: number }).expensesCents).toBe(0);
    });
  });
});

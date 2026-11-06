import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { transactionSummaryDtoSchema } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import {
  listTransactionsResponseSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';

// The routes of `transactions` that `main` mounts today, with no owner of categories, invoices,
// bills or recurrences: what works without them works end to end, on a real SQLite file.
describe('transactions routes (mounted in main)', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let accountId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    accountId = await insertTestAccount(database.db, { name: 'Nubank' });
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

  const listOf = async (query: string) => {
    const response = await send('GET', `/transactions${query}`);
    expect(response.status).toBe(200);

    return listTransactionsResponseSchema.parse(await response.json());
  };

  const insertBank = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, accountId, {
      origin: 'bank',
      nature_set_by: 'system',
      description: 'PADARIA SANTA CLARA',
      bank_description: 'PADARIA SANTA CLARA',
      bank_amount_cents: -1250,
      bank_occurred_on: '2026-11-05',
      bank_counterparty: null,
      bank_status: 'posted',
      search_text: 'PADARIA SANTA CLARA',
      ...overrides,
    });

  describe('POST /transactions', () => {
    it('creates a manual expense, negative, in review, counting on its own date', async () => {
      const dto = await create({});

      expect(dto).toMatchObject({
        accountId,
        origin: 'manual',
        nature: 'expense',
        natureSetBy: 'user',
        method: 'pix',
        description: 'Padaria',
        amountCents: -1250,
        occurredOn: '2026-11-05',
        competenceOn: '2026-11-05',
        invoiceMonth: null,
        categoryId: null,
        categorySource: null,
        tagIds: [],
        splits: [],
        isEdited: false,
        bank: null,
        bankChange: null,
        removedByBankAt: null,
        ignoredAt: null,
        installment: null,
        isInReview: true,
        categorySuggestion: null,
        links: { occurrence: null, bill: null, invoicePayment: null },
        createdAt: NOW,
        updatedAt: NOW,
      });
    });

    it('creates an income as a positive value and trims the description', async () => {
      const dto = await create({ type: 'income', description: '  Salário  ', amountCents: 500000 });

      expect(dto).toMatchObject({ nature: 'income', amountCents: 500000, description: 'Salário' });
    });

    it('saves the search text of the description', async () => {
      const dto = await create({ description: 'Café da manhã' });
      const row = await database.db
        .selectFrom('transactions')
        .select('search_text')
        .where('id', '=', dto.id)
        .executeTakeFirstOrThrow();

      expect(row.search_text).toBe('CAFE DA MANHA');
    });

    it('answers 404 for an account that does not exist and 422 for an archived one', async () => {
      await expectError(
        await send('POST', '/transactions', {
          type: 'expense',
          accountId: generateId(),
          method: 'pix',
          description: 'x',
          amountCents: 100,
          occurredOn: '2026-11-05',
        }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      const archived = await insertTestAccount(database.db, {
        archived_at: '2026-10-01T00:00:00.000Z',
      });
      await expectError(
        await send('POST', '/transactions', {
          type: 'expense',
          accountId: archived,
          method: 'pix',
          description: 'x',
          amountCents: 100,
          occurredOn: '2026-11-05',
        }),
        422,
        'TRANSACTION_ACCOUNT_ARCHIVED',
      );
    });

    it('wants credit on a card and only on a card', async () => {
      const card = await insertTestCreditCard(database.db);

      await expectError(
        await send('POST', '/transactions', {
          type: 'expense',
          accountId,
          method: 'credit',
          description: 'x',
          amountCents: 100,
          occurredOn: '2026-11-05',
        }),
        422,
        'TRANSACTION_METHOD_ACCOUNT_MISMATCH',
      );
      await expectError(
        await send('POST', '/transactions', {
          type: 'expense',
          accountId: card,
          method: 'pix',
          description: 'x',
          amountCents: 100,
          occurredOn: '2026-11-05',
        }),
        422,
        'TRANSACTION_METHOD_ACCOUNT_MISMATCH',
      );
    });

    it('refuses a card purchase while invoices does not exist, and stores nothing', async () => {
      const card = await insertTestCreditCard(database.db);
      const response = await send('POST', '/transactions', {
        type: 'expense',
        accountId: card,
        method: 'credit',
        description: 'Mercado',
        amountCents: 9000,
        occurredOn: '2026-11-05',
      });

      await expectError(response, 400, 'VALIDATION_FAILED');
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });

    it('takes a category and a tag now that categories is wired in main', async () => {
      const category = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db);

      const dto = await create({ categoryId: category, tagIds: [tag] });

      expect(dto).toMatchObject({ categoryId: category, categorySource: 'user', tagIds: [tag] });
    });

    it('refuses what the schema refuses', async () => {
      for (const wrong of [
        { amountCents: 0 },
        { amountCents: -100 },
        { amountCents: 1.5 },
        { description: '   ' },
        { occurredOn: '2026-02-30' },
        { type: 'transfer' },
        { method: 'barter' },
      ]) {
        await expectError(
          await send('POST', '/transactions', {
            type: 'expense',
            accountId,
            method: 'pix',
            description: 'x',
            amountCents: 100,
            occurredOn: '2026-11-05',
            ...wrong,
          }),
          400,
          'VALIDATION_FAILED',
        );
      }
    });
  });

  describe('GET /transactions/:id', () => {
    it('answers the detail, 404 for an unknown id and 400 for a malformed one', async () => {
      const { id } = await create({});

      expect((await dtoOf(await send('GET', `/transactions/${id}`))).id).toBe(id);
      await expectError(
        await send('GET', `/transactions/${generateId()}`),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      await expectError(await send('GET', '/transactions/not-an-id'), 400, 'VALIDATION_FAILED');
    });

    it('shows the bank original, the edit and the pending change of a bank transaction', async () => {
      const id = await insertBank({
        description: 'Café',
        amount_cents: -1800,
        bank_amount_cents: -1300,
        bank_counterparty: 'Padaria Ltda',
        bank_change_json: JSON.stringify([{ field: 'amountCents', before: -1250, after: -1300 }]),
        bank_changed_at: '2026-11-06T10:00:00.000Z',
        edit_note: 'conferido no extrato',
      });

      const dto = await dtoOf(await send('GET', `/transactions/${id}`));

      expect(dto).toMatchObject({
        origin: 'bank',
        isEdited: true,
        bank: {
          description: 'PADARIA SANTA CLARA',
          amountCents: -1300,
          occurredOn: '2026-11-05',
          counterparty: 'Padaria Ltda',
          status: 'posted',
        },
        bankChange: {
          detectedAt: '2026-11-06T10:00:00.000Z',
          changes: [{ field: 'amountCents', before: -1250, after: -1300 }],
        },
        editNote: 'conferido no extrato',
      });
    });
  });

  describe('GET /transactions', () => {
    it('answers a month ordered by competence, then date, then creation, newest first', async () => {
      const older = await create({ description: 'A', occurredOn: '2026-11-02' });
      const sameDayFirst = await create({ description: 'B', occurredOn: '2026-11-04' });
      const sameDayLater = await create({ description: 'C', occurredOn: '2026-11-04' });
      await create({ description: 'Outro mês', occurredOn: '2026-10-30' });

      const { items, nextCursor } = await listOf('?month=2026-11');

      expect(items.map((item) => item.id)).toEqual([sameDayLater.id, sameDayFirst.id, older.id]);
      expect(nextCursor).toBeNull();
    });

    it('puts a parcel in the month of its invoice and orders by that competence', async () => {
      const card = await insertTestCreditCard(database.db);
      const plan = await insertTestInstallmentPlan(database.db, card, {
        purchase_on: '2026-10-31',
        total_cents: 30000,
        installment_count: 3,
        first_invoice_month: '2026-11',
      });
      const parcels = [];
      for (const [number, month] of [
        [1, '2026-11'],
        [2, '2026-12'],
        [3, '2027-01'],
      ] as const) {
        parcels.push(
          await insertTestTransaction(database.db, card, {
            method: 'credit',
            description: 'Cadeira ergonômica',
            amount_cents: -10000,
            // The bank dated every parcel on the day of the purchase; the competence is calculated.
            occurred_on: '2026-10-31',
            invoice_month: month,
            installment_plan_id: plan,
            installment_number: number,
          }),
        );
      }
      const normal = await create({ description: 'Mercado', occurredOn: '2026-11-29' });

      const november = await listOf('?month=2026-11');
      const december = await listOf('?month=2026-12');
      const all = await listOf('');

      expect(november.items.map((item) => item.id)).toEqual([parcels[0], normal.id]);
      expect(november.items[0]).toMatchObject({
        occurredOn: '2026-10-31',
        competenceOn: '2026-11-30',
        invoiceMonth: '2026-11',
        installment: { planId: plan, number: 1, count: 3 },
      });
      expect(december.items.map((item) => item.id)).toEqual([parcels[1]]);
      expect(december.items[0]?.competenceOn).toBe('2026-12-31');
      // Paging by one over the same list never skips nor repeats, parcels included.
      const paged: string[] = [];
      let cursor: string | null = null;
      do {
        const page: Awaited<ReturnType<typeof listOf>> = await listOf(
          `?limit=1${cursor ? `&cursor=${cursor}` : ''}`,
        );
        paged.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor;
      } while (cursor);
      expect(paged).toEqual(all.items.map((item) => item.id));
      expect(all.items.map((item) => item.competenceOn)).toEqual([
        '2027-01-31',
        '2026-12-31',
        '2026-11-30',
        '2026-11-29',
      ]);
    });

    it('reads a free period page by page, with no repetition and no gap', async () => {
      const ids: string[] = [];
      for (let day = 1; day <= 7; day++) {
        ids.push(
          (await create({ description: `D${String(day)}`, occurredOn: `2026-11-0${String(day)}` }))
            .id,
        );
      }
      await create({ description: 'Fora', occurredOn: '2026-10-15' });

      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const page: Awaited<ReturnType<typeof listOf>> = await listOf(
          `?from=2026-11-01&to=2026-11-07&limit=3${cursor ? `&cursor=${cursor}` : ''}`,
        );
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor);

      expect(pages).toBe(3);
      expect(seen).toEqual([...ids].reverse());
    });

    it('keeps the order across pages when many share the same date', async () => {
      for (let index = 0; index < 5; index++) {
        await create({ description: `Mesmo dia ${String(index)}`, occurredOn: '2026-11-03' });
      }

      const first = await listOf('?limit=2');
      const second = await listOf(`?limit=2&cursor=${first.nextCursor ?? ''}`);
      const third = await listOf(`?limit=2&cursor=${second.nextCursor ?? ''}`);
      const everything = await listOf('');

      expect([...first.items, ...second.items, ...third.items].map((item) => item.id)).toEqual(
        everything.items.map((item) => item.id),
      );
      expect(third.nextCursor).toBeNull();
    });

    it('filters by account, direction, text and ignored ones stay in', async () => {
      const other = await insertTestAccount(database.db, { name: 'Outro' });
      const coffee = await create({ description: 'Café Pilão' });
      const salary = await create({ type: 'income', description: 'Salário', amountCents: 9000 });
      await send('POST', `/transactions/${salary.id}/ignore`);
      await insertTestTransaction(database.db, other, { description: 'Café', search_text: 'CAFE' });

      expect((await listOf(`?accountId=${accountId}`)).items).toHaveLength(2);
      expect((await listOf('?direction=out')).items.map((item) => item.description)).toEqual(
        expect.arrayContaining(['Café Pilão', 'Café']),
      );
      expect((await listOf(`?accountId=${accountId}&direction=in`)).items).toHaveLength(1);
      const found = await listOf(`?search=${encodeURIComponent('cafe')}`);
      expect(found.items).toHaveLength(2);
      expect(
        (await listOf(`?search=${encodeURIComponent('pilão')}`)).items.map((i) => i.id),
      ).toEqual([coffee.id]);
      expect((await listOf('?search=%25')).items).toEqual([]);
      expect(
        (await listOf(`?accountId=${accountId}`)).items.map((i) => i.ignoredAt !== null),
      ).toContain(true);
    });

    it('answers 404 for an account that does not exist, and an empty list for other unknown ids', async () => {
      await expectError(
        await send('GET', `/transactions?accountId=${generateId()}`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      expect((await listOf(`?categoryId=${generateId()}`)).items).toEqual([]);
      expect((await listOf(`?tagId=${generateId()}`)).items).toEqual([]);
      expect((await listOf(`?ruleId=${generateId()}`)).items).toEqual([]);
      expect((await listOf(`?installmentPlanId=${generateId()}`)).items).toEqual([]);
    });

    it('filters by category (or a part of it), tag, uncategorized and plan', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db);
      const withCategory = await insertTestTransaction(database.db, accountId, {
        category_id: food,
        category_source: 'user',
        description: 'Mercado',
      });
      const withTag = await insertTestTransaction(database.db, accountId, { description: 'Taxi' });
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: withTag, tag_id: tag })
        .execute();
      const divided = await insertTestTransaction(database.db, accountId, {
        description: 'Churrasco',
        amount_cents: -5000,
      });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: divided,
            position: 1,
            amount_cents: -3000,
            nature: 'expense',
            category_id: food,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: divided,
            position: 2,
            amount_cents: -2000,
            nature: 'expense',
            category_id: fun,
            description: null,
          },
        ])
        .execute();

      const ids = (query: string) =>
        listOf(query).then((page) => page.items.map((i) => i.id).sort());

      expect(await ids(`?categoryId=${food}`)).toEqual([withCategory, divided].sort());
      expect(await ids(`?categoryId=${fun}`)).toEqual([divided]);
      expect(await ids(`?tagId=${tag}`)).toEqual([withTag]);
      expect(await ids('?uncategorized=true')).toEqual([withTag]);
      expect(await ids('?uncategorized=false')).toEqual([withCategory, divided].sort());
    });

    it('refuses combinations the contract refuses', async () => {
      for (const query of [
        '?month=2026-11&limit=10',
        '?month=2026-11&cursor=x',
        '?month=2026-11&from=2026-11-01',
        '?from=2026-11-10&to=2026-11-01',
        `?categoryId=${generateId()}&uncategorized=true`,
        '?limit=501',
        '?search=',
        '?month=2026-13',
        '?cursor=not-a-cursor-of-ours',
      ]) {
        await expectError(await send('GET', `/transactions${query}`), 400, 'VALIDATION_FAILED');
      }
    });
  });

  describe('GET /transactions/summary', () => {
    it('adds spending, income and what is outside the account, by competence', async () => {
      const other = await insertTestAccount(database.db, { name: 'Outro' });
      const insert = (
        overrides: Parameters<typeof insertTestTransaction>[2],
        account = accountId,
      ) => insertTestTransaction(database.db, account, { occurred_on: '2026-11-03', ...overrides });
      await insert({ amount_cents: -10000 });
      await insert({ amount_cents: -2500, category_id: await insertTestCategory(database.db) });
      await insert({ amount_cents: 700, description: 'Estorno' });
      await insert({ nature: 'income', amount_cents: 400000 });
      // Outside the account: only the leg that leaves counts in a transfer.
      await insert({ nature: 'transfer', amount_cents: -50000 });
      await insert({ nature: 'transfer', amount_cents: 50000 }, other);
      await insert({ nature: 'invoice_payment', amount_cents: -80000 });
      await insert({ nature: 'balance_adjustment', amount_cents: 1000 });
      await insert({ nature: 'lent', amount_cents: -3000 });
      await insert({ nature: 'reimbursed', amount_cents: 3000 });
      // Out of the sum: ignored, other month.
      await insert({ amount_cents: -999, ignored_at: NOW });
      await insert({ amount_cents: -888, occurred_on: '2026-10-31' });
      // A divided one counts by the parts.
      const divided = await insert({ amount_cents: -6000, description: 'Racha' });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: divided,
            position: 1,
            amount_cents: -3000,
            nature: 'expense',
            category_id: null,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: divided,
            position: 2,
            amount_cents: -3000,
            nature: 'lent',
            category_id: null,
            description: 'Júlia',
          },
        ])
        .execute();

      const response = await send('GET', '/transactions/summary?month=2026-11');
      const summary = transactionSummaryDtoSchema.parse(await response.json());

      expect(summary).toEqual({
        month: '2026-11',
        // 10000 + 2500 - 700 + 3000 (part of the divided one)
        expensesCents: 14800,
        incomesCents: 400000,
        // transfer 50000 + payment 80000 + adjustment 1000 + lent 3000 + reimbursed 3000 + part 3000
        outsideCents: 140000,
        // in review: the 10000 and the refund (no category, not divided)
        reviewCount: 2 + 1,
        reviewTotalCents: 10000 + 700 + 400000,
      });
    });

    it('wants the month', async () => {
      await expectError(await send('GET', '/transactions/summary'), 400, 'VALIDATION_FAILED');
    });

    it('answers zeros for a month with nothing', async () => {
      const summary = transactionSummaryDtoSchema.parse(
        await (await send('GET', '/transactions/summary?month=2030-01')).json(),
      );

      expect(summary).toEqual({
        month: '2030-01',
        expensesCents: 0,
        incomesCents: 0,
        outsideCents: 0,
        reviewCount: 0,
        reviewTotalCents: 0,
      });
    });
  });

  describe('GET /transactions/review-queue', () => {
    it('lists the oldest first, counts the whole queue and cuts only the items', async () => {
      const newest = await create({ description: 'Novo', occurredOn: '2026-11-05' });
      const oldest = await create({ description: 'Netflix 03/10', occurredOn: '2026-11-01' });
      const middle = await create({ description: 'Meio', occurredOn: '2026-11-03' });
      await create({ description: 'Outra', occurredOn: '2026-11-02' });
      await send('POST', `/transactions/${(await create({ occurredOn: '2026-11-04' })).id}/ignore`);
      await insertTestTransaction(database.db, accountId, {
        nature: 'transfer',
        occurred_on: '2026-11-01',
      });

      const full = reviewQueueDtoSchema.parse(
        await (await send('GET', '/transactions/review-queue')).json(),
      );
      const cut = reviewQueueDtoSchema.parse(
        await (await send('GET', '/transactions/review-queue?limit=2')).json(),
      );
      const october = reviewQueueDtoSchema.parse(
        await (await send('GET', '/transactions/review-queue?month=2026-10')).json(),
      );

      expect(full.items.map((item) => item.transaction.id).slice(0, 3)).toEqual([
        oldest.id,
        expect.any(String),
        middle.id,
      ]);
      expect(full.items.at(-1)?.transaction.id).toBe(newest.id);
      expect(full.total).toBe(4);
      expect(cut.total).toBe(4);
      expect(cut.items).toHaveLength(2);
      expect(october).toEqual({ total: 0, items: [] });
      expect(full.items[0]).toMatchObject({
        rulePattern: 'NETFLIX',
        categorySuggestions: [],
        recurrenceCandidates: [],
      });
      expect(full.items.every((item) => item.transaction.isInReview)).toBe(true);
    });

    it('limits to 200 at most', async () => {
      await expectError(
        await send('GET', '/transactions/review-queue?limit=201'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('PATCH /transactions/:id', () => {
    const patch = (id: string, body: unknown) => send('PATCH', `/transactions/${id}`, body);

    it('edits description, amount and date of a manual transaction, keeping the sign', async () => {
      const { id } = await create({});

      const dto = await dtoOf(
        await patch(id, {
          description: 'Padaria nova',
          amountCents: 1800,
          occurredOn: '2026-11-04',
          editNote: 'ajustado',
        }),
      );

      expect(dto).toMatchObject({
        description: 'Padaria nova',
        amountCents: -1800,
        occurredOn: '2026-11-04',
        competenceOn: '2026-11-04',
        editNote: 'ajustado',
        isEdited: false,
        updatedAt: NOW,
      });
      const row = await database.db
        .selectFrom('transactions')
        .select('search_text')
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      expect(row.search_text).toBe('PADARIA NOVA');
    });

    it('marks a bank transaction as edited and leaves the original untouched', async () => {
      const id = await insertBank();

      const dto = await dtoOf(
        await patch(id, { description: 'Padaria da esquina', amountCents: 1500 }),
      );

      expect(dto).toMatchObject({
        isEdited: true,
        description: 'Padaria da esquina',
        amountCents: -1500,
        bank: { description: 'PADARIA SANTA CLARA', amountCents: -1250, occurredOn: '2026-11-05' },
      });
    });

    it('goes back to not edited when the three fields match the original again', async () => {
      const id = await insertBank();
      await patch(id, { description: 'Outra', amountCents: 1500, occurredOn: '2026-11-01' });

      const dto = await dtoOf(
        await patch(id, {
          description: 'PADARIA SANTA CLARA',
          amountCents: 1250,
          occurredOn: '2026-11-05',
        }),
      );

      expect(dto.isEdited).toBe(false);
    });

    it('clears the note, the category and the tags with null and an empty list', async () => {
      const { id } = await create({});
      await patch(id, { editNote: 'x' });

      const dto = await dtoOf(await patch(id, { editNote: null, categoryId: null, tagIds: [] }));

      expect(dto).toMatchObject({ editNote: null, categoryId: null, tagIds: [] });
    });

    it('changes the nature among expense, income and transfer, wanting the sign to fit', async () => {
      const { id } = await create({});

      await expectError(
        await patch(id, { nature: 'income' }),
        422,
        'TRANSACTION_NATURE_SIGN_MISMATCH',
      );
      const dto = await dtoOf(await patch(id, { nature: 'transfer' }));
      expect(dto).toMatchObject({ nature: 'transfer', natureSetBy: 'user', isInReview: false });
    });

    it('links the two legs of a transfer, cuts the link and gives them back by the sign', async () => {
      const other = await insertTestAccount(database.db, { name: 'Poupança' });
      const out = await create({ amountCents: 5000, description: 'Para poupança' });
      const into = await dtoOf(
        await send('POST', '/transactions', {
          type: 'income',
          accountId: other,
          method: 'transfer',
          description: 'Da corrente',
          amountCents: 5000,
          occurredOn: '2026-11-05',
        }),
        201,
      );

      const linked = await dtoOf(
        await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id }),
      );
      const counterpart = await dtoOf(await send('GET', `/transactions/${into.id}`));

      expect(linked).toMatchObject({ nature: 'transfer', transferCounterpartId: into.id });
      expect(counterpart).toMatchObject({
        nature: 'transfer',
        natureSetBy: 'user',
        transferCounterpartId: out.id,
      });

      const unlinked = await dtoOf(await patch(out.id, { nature: 'expense' }));
      const freed = await dtoOf(await send('GET', `/transactions/${into.id}`));
      expect(unlinked).toMatchObject({ nature: 'expense', transferCounterpartId: null });
      expect(freed).toMatchObject({ nature: 'transfer', transferCounterpartId: null });
    });

    it('refuses a counterpart that does not fit', async () => {
      const out = await create({ amountCents: 5000 });
      const sameAccount = await create({ type: 'income', amountCents: 5000 });
      const other = await insertTestAccount(database.db, { name: 'Poupança' });
      const otherValue = await insertTestTransaction(database.db, other, { amount_cents: 4000 });

      await expectError(
        await patch(out.id, { nature: 'transfer', transferCounterpartId: sameAccount.id }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await patch(out.id, { nature: 'transfer', transferCounterpartId: otherValue }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await patch(out.id, { nature: 'transfer', transferCounterpartId: generateId() }),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      await expectError(
        await patch(out.id, { transferCounterpartId: otherValue }),
        400,
        'VALIDATION_FAILED',
      );
      const unchanged = await dtoOf(await send('GET', `/transactions/${out.id}`));
      expect(unchanged.nature).toBe('expense');
    });

    it('mirrors an edited amount on the other leg of a transfer, keeping both accounts and the summary right', async () => {
      const other = await insertTestAccount(database.db, { name: 'Poupança' });
      const out = await create({ amountCents: 5000, description: 'Para poupança' });
      const into = await insertTestTransaction(database.db, other, {
        amount_cents: 5000,
        nature: 'income',
      });
      await patch(out.id, { nature: 'transfer', transferCounterpartId: into });

      const edited = await dtoOf(await patch(out.id, { amountCents: 7000 }));
      const leg = await dtoOf(await send('GET', `/transactions/${into}`));
      const summary = transactionSummaryDtoSchema.parse(
        await (await send('GET', '/transactions/summary?month=2026-11')).json(),
      );
      const accounts = (await (await send('GET', '/accounts')).json()) as {
        items: { id: string; balanceCents: number }[];
      };
      const balance = (id: string) => accounts.items.find((item) => item.id === id)?.balanceCents;

      expect(edited.amountCents).toBe(-7000);
      expect(leg).toMatchObject({
        amountCents: 7000,
        nature: 'transfer',
        transferCounterpartId: out.id,
      });
      expect(summary.outsideCents).toBe(7000);
      expect((balance(accountId) ?? 0) + (balance(other) ?? 0)).toBe(0);
      expect(balance(other)).toBe(7000);
    });

    it('refuses to turn a card refund into income', async () => {
      const card = await insertTestCreditCard(database.db);
      const refund = await insertTestTransaction(database.db, card, {
        method: 'credit',
        amount_cents: 1500,
        invoice_month: '2026-11',
      });

      await expectError(await patch(refund, { nature: 'income' }), 400, 'VALIDATION_FAILED');
      expect((await dtoOf(await send('GET', `/transactions/${refund}`))).nature).toBe('expense');
    });

    it('locks the natures another flow owns', async () => {
      for (const nature of ['lent', 'reimbursed', 'balance_adjustment'] as const) {
        const id = await insertTestTransaction(database.db, accountId, { nature });
        await expectError(await patch(id, { nature: 'expense' }), 422, 'TRANSACTION_NATURE_LOCKED');
      }
    });

    it('refuses a category on a transaction outside the account', async () => {
      const category = await insertTestCategory(database.db);
      const id = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });

      await expectError(
        await patch(id, { categoryId: category }),
        422,
        'TRANSACTION_CATEGORY_NOT_ALLOWED',
      );
    });

    it('refuses a split transaction a new value, nature or category', async () => {
      const { id } = await create({});
      await send('PUT', `/transactions/${id}/splits`, {
        parts: [{ amountCents: 1000 }, { amountCents: 250 }],
      });

      await expectError(await patch(id, { amountCents: 2000 }), 422, 'TRANSACTION_IS_SPLIT');
      await expectError(await patch(id, { nature: 'transfer' }), 422, 'TRANSACTION_IS_SPLIT');
      expect((await dtoOf(await patch(id, { description: 'Racha' }))).description).toBe('Racha');
      expect((await dtoOf(await patch(id, { categoryId: null }))).splits).toHaveLength(2);
    });

    it('keeps the invoice of a parcel when its date moves (N6)', async () => {
      const card = await insertTestCreditCard(database.db);
      const plan = await insertTestInstallmentPlan(database.db, card);
      const id = await insertTestTransaction(database.db, card, {
        method: 'credit',
        amount_cents: -10000,
        occurred_on: '2026-10-31',
        invoice_month: '2026-11',
        installment_plan_id: plan,
        installment_number: 1,
      });

      const dto = await dtoOf(await patch(id, { occurredOn: '2026-10-20' }));

      expect(dto).toMatchObject({
        occurredOn: '2026-10-20',
        invoiceMonth: '2026-11',
        competenceOn: '2026-11-30',
      });
    });

    it('refuses a new date on a card purchase while invoices does not exist', async () => {
      const card = await insertTestCreditCard(database.db);
      const id = await insertTestTransaction(database.db, card, {
        method: 'credit',
        invoice_month: '2026-11',
      });

      await expectError(await patch(id, { occurredOn: '2026-11-20' }), 400, 'VALIDATION_FAILED');
      expect((await dtoOf(await send('GET', `/transactions/${id}`))).occurredOn).toBe('2026-11-05');
    });

    it('answers 404, and 400 for an empty body, an unknown key and a bad value', async () => {
      const { id } = await create({});

      await expectError(
        await patch(generateId(), { description: 'x' }),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      for (const body of [
        {},
        { accountId },
        { amountCents: 0 },
        { amountCents: -5 },
        { description: '' },
      ]) {
        await expectError(await patch(id, body), 400, 'VALIDATION_FAILED');
      }
    });
  });

  describe('ignore and unignore', () => {
    it('ignores, undoes, and refuses twice', async () => {
      const { id } = await create({});

      const ignored = await dtoOf(await send('POST', `/transactions/${id}/ignore`));
      expect(ignored.ignoredAt).toBe(NOW);
      expect(ignored.isInReview).toBe(false);
      await expectError(
        await send('POST', `/transactions/${id}/ignore`),
        409,
        'TRANSACTION_ALREADY_IGNORED',
      );

      const back = await dtoOf(await send('POST', `/transactions/${id}/unignore`));
      expect(back).toMatchObject({ ignoredAt: null, isInReview: true });
      await expectError(
        await send('POST', `/transactions/${id}/unignore`),
        409,
        'TRANSACTION_NOT_IGNORED',
      );
    });

    it('answers 404 for an unknown id', async () => {
      await expectError(
        await send('POST', `/transactions/${generateId()}/ignore`),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      await expectError(
        await send('POST', `/transactions/${generateId()}/unignore`),
        404,
        'TRANSACTION_NOT_FOUND',
      );
    });
  });

  describe('splits', () => {
    const split = (id: string, parts: unknown[]) =>
      send('PUT', `/transactions/${id}/splits`, { parts });

    it('splits in two with the sign of the transaction and takes it out of the review', async () => {
      const { id } = await create({});

      const dto = await dtoOf(
        await split(id, [
          { amountCents: 1000 },
          { amountCents: 250, description: 'Metade da Júlia' },
        ]),
      );

      expect(dto.splits.map((part) => [part.position, part.amountCents, part.nature])).toEqual([
        [1, -1000, 'expense'],
        [2, -250, 'expense'],
      ]);
      expect(dto.splits[1]?.description).toBe('Metade da Júlia');
      expect(dto).toMatchObject({ categoryId: null, isInReview: false });
    });

    it('is redone by a second call and undone by DELETE, going back to review', async () => {
      const { id } = await create({});
      await split(id, [{ amountCents: 1000 }, { amountCents: 250 }]);

      const redone = await dtoOf(await split(id, [{ amountCents: 600 }, { amountCents: 650 }]));
      expect(redone.splits.map((part) => part.amountCents)).toEqual([-600, -650]);

      const undone = await dtoOf(await send('DELETE', `/transactions/${id}/splits`));
      expect(undone).toMatchObject({ splits: [], categoryId: null, isInReview: true });
      await expectError(
        await send('DELETE', `/transactions/${id}/splits`),
        409,
        'TRANSACTION_NOT_SPLIT',
      );
    });

    it('splits an income and keeps the sign', async () => {
      const { id } = await create({ type: 'income', amountCents: 1000 });

      const dto = await dtoOf(await split(id, [{ amountCents: 400 }, { amountCents: 600 }]));

      expect(dto.splits.map((part) => [part.amountCents, part.nature])).toEqual([
        [400, 'income'],
        [600, 'income'],
      ]);
    });

    it('refuses a sum that differs, a nature that does not split and a part of a friend', async () => {
      const { id } = await create({});
      await expectError(
        await split(id, [{ amountCents: 1000 }, { amountCents: 249 }]),
        422,
        'TRANSACTION_SPLIT_SUM_MISMATCH',
      );
      const transfer = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });
      await expectError(
        await split(transfer, [{ amountCents: 1000 }, { amountCents: 250 }]),
        422,
        'TRANSACTION_SPLIT_NOT_ALLOWED',
      );

      const shared = await insertTestTransaction(database.db, accountId, { amount_cents: -1000 });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: shared,
            position: 1,
            amount_cents: -500,
            nature: 'expense',
            category_id: null,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: shared,
            position: 2,
            amount_cents: -500,
            nature: 'lent',
            category_id: null,
            description: 'Amigo',
          },
        ])
        .execute();
      await expectError(
        await split(shared, [{ amountCents: 600 }, { amountCents: 400 }]),
        422,
        'TRANSACTION_SPLIT_LINKED_TO_BILL',
      );
      await expectError(
        await send('DELETE', `/transactions/${shared}/splits`),
        422,
        'TRANSACTION_SPLIT_LINKED_TO_BILL',
      );
    });

    it('takes a category in a part now that categories is wired in main', async () => {
      const { id } = await create({});
      const category = await insertTestCategory(database.db);

      const dto = await dtoOf(
        await split(id, [{ amountCents: 1000, categoryId: category }, { amountCents: 250 }]),
      );

      expect(dto.splits.map((part) => part.categoryId)).toEqual([category, null]);
    });

    it('answers 404 and refuses a number of parts other than two', async () => {
      await expectError(
        await split(generateId(), [{ amountCents: 1 }, { amountCents: 1 }]),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      const { id } = await create({});
      for (const parts of [[], [{ amountCents: 1250 }], [{ amountCents: 1 }, { amountCents: 0 }]]) {
        await expectError(await split(id, parts), 400, 'VALIDATION_FAILED');
      }
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('deletes a manual transaction with its parts and tags', async () => {
      const { id } = await create({});
      await send('PUT', `/transactions/${id}/splits`, {
        parts: [{ amountCents: 1000 }, { amountCents: 250 }],
      });
      await database.db
        .insertInto('transaction_tags')
        .values({ transaction_id: id, tag_id: await insertTestTag(database.db) })
        .execute();

      const response = await send('DELETE', `/transactions/${id}`);

      expect(response.status).toBe(204);
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
      expect(await database.db.selectFrom('transaction_splits').select('id').execute()).toEqual([]);
      expect(await database.db.selectFrom('transaction_tags').select('tag_id').execute()).toEqual(
        [],
      );
    });

    it('refuses an imported one and a parcel, and answers 404', async () => {
      const imported = await insertBank();
      const card = await insertTestCreditCard(database.db);
      const plan = await insertTestInstallmentPlan(database.db, card);
      const parcel = await insertTestTransaction(database.db, card, {
        method: 'credit',
        invoice_month: '2026-11',
        installment_plan_id: plan,
        installment_number: 1,
      });

      await expectError(
        await send('DELETE', `/transactions/${imported}`),
        422,
        'TRANSACTION_NOT_MANUAL',
      );
      await expectError(
        await send('DELETE', `/transactions/${parcel}`),
        422,
        'TRANSACTION_IS_INSTALLMENT',
      );
      await expectError(
        await send('DELETE', `/transactions/${generateId()}`),
        404,
        'TRANSACTION_NOT_FOUND',
      );
    });

    it('gives the other leg of a transfer back to expense or income by its sign', async () => {
      const other = await insertTestAccount(database.db, { name: 'Poupança' });
      const out = await create({ amountCents: 5000 });
      const into = await insertTestTransaction(database.db, other, { amount_cents: 5000 });
      await send('PATCH', `/transactions/${out.id}`, {
        nature: 'transfer',
        transferCounterpartId: into,
      });

      await send('DELETE', `/transactions/${out.id}`);

      const freed = await dtoOf(await send('GET', `/transactions/${into}`));
      expect(freed).toMatchObject({
        nature: 'income',
        natureSetBy: 'system',
        transferCounterpartId: null,
        isInReview: true,
      });
    });
  });

  describe('restore-original and bank-change/resolve', () => {
    it('restores the original, clears the note and the alert, and is idempotent', async () => {
      const id = await insertBank({
        description: 'Café',
        amount_cents: -1800,
        occurred_on: '2026-11-01',
        edit_note: 'x',
        bank_change_json: JSON.stringify([{ field: 'amountCents', before: -1250, after: -1300 }]),
        bank_changed_at: NOW,
        bank_amount_cents: -1300,
      });

      const dto = await dtoOf(await send('POST', `/transactions/${id}/restore-original`));
      expect(dto).toMatchObject({
        description: 'PADARIA SANTA CLARA',
        amountCents: -1300,
        occurredOn: '2026-11-05',
        editNote: null,
        bankChange: null,
        isEdited: false,
      });

      const again = await dtoOf(await send('POST', `/transactions/${id}/restore-original`));
      expect(again.updatedAt).toBe(dto.updatedAt);
    });

    it('refuses a manual transaction and a split one whose amount would change', async () => {
      const { id } = await create({});
      await expectError(
        await send('POST', `/transactions/${id}/restore-original`),
        422,
        'TRANSACTION_NOT_FROM_BANK',
      );

      const split = await insertBank({ amount_cents: -1800, bank_amount_cents: -1250 });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: split,
            position: 1,
            amount_cents: -1000,
            nature: 'expense',
            category_id: null,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: split,
            position: 2,
            amount_cents: -800,
            nature: 'expense',
            category_id: null,
            description: null,
          },
        ])
        .execute();
      await expectError(
        await send('POST', `/transactions/${split}/restore-original`),
        422,
        'TRANSACTION_IS_SPLIT',
      );
    });

    const withChange = () =>
      insertBank({
        description: 'Café',
        amount_cents: -1800,
        bank_amount_cents: -1300,
        bank_change_json: JSON.stringify([{ field: 'amountCents', before: -1250, after: -1300 }]),
        bank_changed_at: NOW,
      });

    it('uses the bank value or keeps his own, and the alert goes away in both', async () => {
      const bank = await withChange();
      const mine = await withChange();

      const usedBank = await dtoOf(
        await send('POST', `/transactions/${bank}/bank-change/resolve`, { use: 'bank' }),
      );
      const keptMine = await dtoOf(
        await send('POST', `/transactions/${mine}/bank-change/resolve`, { use: 'mine' }),
      );

      expect(usedBank).toMatchObject({ amountCents: -1300, description: 'Café', bankChange: null });
      expect(keptMine).toMatchObject({ amountCents: -1800, description: 'Café', bankChange: null });
    });

    it('lets an edited transaction the bank removed stay with "mine" or leave with "bank"', async () => {
      const stays = await insertBank({ description: 'Café', bank_removed_at: NOW });
      const leaves = await insertBank({ description: 'Café', bank_removed_at: NOW });

      const kept = await dtoOf(
        await send('POST', `/transactions/${stays}/bank-change/resolve`, { use: 'mine' }),
      );
      const accepted = await dtoOf(
        await send('POST', `/transactions/${leaves}/bank-change/resolve`, { use: 'bank' }),
      );

      expect(kept).toMatchObject({ removedByBankAt: null, description: 'Café' });
      expect(accepted).toMatchObject({
        description: 'PADARIA SANTA CLARA',
        isEdited: false,
        removedByBankAt: NOW,
      });
    });

    it('has nothing to resolve without a change, and validates the body', async () => {
      const id = await insertBank();
      await expectError(
        await send('POST', `/transactions/${id}/bank-change/resolve`, { use: 'bank' }),
        422,
        'TRANSACTION_NO_BANK_CHANGE',
      );
      await expectError(
        await send('POST', `/transactions/${id}/bank-change/resolve`, { use: 'both' }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('POST', `/transactions/${generateId()}/bank-change/resolve`, { use: 'bank' }),
        404,
        'TRANSACTION_NOT_FOUND',
      );
    });
  });

  describe('what main keeps out until its owners exist', () => {
    it('does not mount the creation and the list of installment plans', async () => {
      for (const [method, path] of [
        ['GET', '/installment-plans'],
        ['POST', '/installment-plans'],
      ] as const) {
        await expectError(
          await send(method, path, method === 'POST' ? {} : undefined),
          404,
          'ROUTE_NOT_FOUND',
        );
      }
    });
  });

  describe('DELETE /installment-plans/:id', () => {
    it('deletes the plan and its parcels', async () => {
      const card = await insertTestCreditCard(database.db);
      const plan = await insertTestInstallmentPlan(database.db, card);
      for (const number of [1, 2, 3]) {
        await insertTestTransaction(database.db, card, {
          method: 'credit',
          invoice_month: `2026-1${String(number)}`.replace('2026-13', '2027-01'),
          installment_plan_id: plan,
          installment_number: number,
        });
      }
      const other = await insertTestTransaction(database.db, card, {
        method: 'credit',
        invoice_month: '2026-11',
      });

      const response = await send('DELETE', `/installment-plans/${plan}`);

      expect(response.status).toBe(204);
      expect(await database.db.selectFrom('installment_plans').select('id').execute()).toEqual([]);
      expect(
        (await database.db.selectFrom('transactions').select('id').execute()).map((row) => row.id),
      ).toEqual([other]);
    });

    it('refuses the plan of the bank and answers 404 and 400', async () => {
      const card = await insertTestCreditCard(database.db);
      const plan = await insertTestInstallmentPlan(database.db, card, { origin: 'bank' });

      await expectError(
        await send('DELETE', `/installment-plans/${plan}`),
        422,
        'INSTALLMENT_PLAN_NOT_MANUAL',
      );
      await expectError(
        await send('DELETE', `/installment-plans/${generateId()}`),
        404,
        'INSTALLMENT_PLAN_NOT_FOUND',
      );
      await expectError(await send('DELETE', '/installment-plans/nope'), 400, 'VALIDATION_FAILED');
    });
  });
});

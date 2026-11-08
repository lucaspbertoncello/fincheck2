import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { invoiceDetailDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { listSubscriptionsResponseSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

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

// The same, for `invoices`: the app `main` builds, not the test app of one module. Each test needs
// one reader or route that `createApp` has to plug in, and fails if it is left out: the invoice
// month of a card purchase (`invoiceMonths`), the installment plans (`openInvoiceMonths`), the
// link of a payment on the transaction (`links`) and the routes of deletion of an account.
describe('createApp wires invoices into transactions and accounts', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let cardId: string;
  let checkingId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    cardId = await insertTestCreditCard(database.db);
    checkingId = await insertTestAccount(database.db);
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

  it('creates a card purchase with its invoice month: 201 (not the 400 of an unplugged reader)', async () => {
    const response = await send('POST', '/transactions', {
      type: 'expense',
      accountId: cardId,
      method: 'credit',
      description: 'Mercado',
      amountCents: 9000,
      occurredOn: '2026-11-05',
    });

    expect(response.status).toBe(201);
    expect(transactionDtoSchema.parse(await response.json()).invoiceMonth).toBe('2026-11');
  });

  it('lists and creates installment plans: 200 and 201, not 404', async () => {
    const list = await send('GET', '/installment-plans');
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual({ items: [] });

    const created = await send('POST', '/installment-plans', {
      accountId: cardId,
      description: 'Cadeira',
      totalCents: 30000,
      installmentCount: 3,
      firstInvoiceMonth: '2026-12',
      purchaseOn: '2026-11-05',
    });
    expect(created.status).toBe(201);
    // The next parcel starts from the open invoice, which only `invoices` knows (2026-12 today).
    expect(await created.json()).toMatchObject({
      nextInstallment: { number: 1, invoiceMonth: '2026-12' },
      remainingCents: 30000,
    });
  });

  it('answers the deletion impact of an account: 200, not 404', async () => {
    const response = await send('GET', `/accounts/${cardId}/deletion-impact`);

    expect(response.status).toBe(200);
    expect(deletionImpactDtoSchema.parse(await response.json())).toMatchObject({
      transactionCount: 0,
      invoiceCount: 0,
      ruleCount: 0,
    });
  });

  it('deletes an account: 204', async () => {
    expect((await send('DELETE', `/accounts/${cardId}`)).status).toBe(204);
  });

  it('answers the invoices of a card: the three read routes and the open ones', async () => {
    for (const path of [
      '/invoices/open',
      `/cards/${cardId}/invoices`,
      `/cards/${cardId}/invoices/2026-12`,
    ]) {
      expect((await send('GET', path)).status).toBe(200);
    }
  });

  it('shows on the transaction the invoice it pays (the links reader)', async () => {
    const debit = transactionDtoSchema.parse(
      await (
        await send('POST', '/transactions', {
          type: 'expense',
          accountId: checkingId,
          method: 'pix',
          description: 'Fatura',
          amountCents: 4000,
          occurredOn: '2026-11-10',
        })
      ).json(),
    );
    const paid = await send('POST', `/cards/${cardId}/invoices/2026-11/payments`, {
      amountCents: 4000,
      paidOn: '2026-11-10',
      transactionId: debit.id,
    });
    expect(paid.status).toBe(201);

    const after = transactionDtoSchema.parse(
      await (await send('GET', `/transactions/${debit.id}`)).json(),
    );

    expect(after).toMatchObject({
      nature: 'invoice_payment',
      links: { invoicePayment: { accountId: cardId, month: '2026-11' } },
    });
    // The link locks the nature (TRANSACTION_NATURE_LOCKED): it only changes by undoing the payment.
    const locked = await send('PATCH', `/transactions/${debit.id}`, { nature: 'expense' });
    expect(locked.status).toBe(422);
    expect(apiErrorSchema.parse(await locked.json()).code).toBe('TRANSACTION_NATURE_LOCKED');
  });
});

// The same, for `recurrences`: the app `main` builds, not the test app of one module. Each test
// needs one reader or route that `createApp` has to plug in, and fails if it is left out: the link
// of an occurrence on the transaction (`links`), the candidates of the review queue
// (`recurrenceCandidates`), the expected recurrences of an invoice (`expectations`), the routes of
// the subscriptions and the category that the link puts on the transaction.
describe('createApp wires recurrences into transactions and invoices', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  it('creates a recurrence, ties a transaction to its occurrence and shows the link on the transaction', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const expense = await insertTestExpense(world.database.db, world.checking, {
      cents: 10990,
      on: '2026-10-10',
      description: 'Academia Smart',
    });

    const linked = await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
      transactionId: expense,
    });
    const dto = await world.occurrenceOf(linked, 201);
    expect(dto).toMatchObject({ status: 'confirmed', receivedCents: 10990 });

    const after = transactionDtoSchema.parse(
      await (await world.send('GET', `/transactions/${expense}`)).json(),
    );
    expect(after.links.occurrence).toEqual({
      occurrenceId: occurrence?.id,
      recurrenceName: 'Academia',
    });
  });

  it('puts the category of the recurrence on the transaction it settles (the use case of transactions is plugged)', async () => {
    const categoryId = await insertTestCategory(world.database.db, { name: 'Saúde teste' });
    const { occurrence } = await world.create({ categoryId });
    const expense = await insertTestExpense(world.database.db, world.checking, {
      cents: 10990,
      on: '2026-10-10',
    });

    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: expense });

    const after = transactionDtoSchema.parse(
      await (await world.send('GET', `/transactions/${expense}`)).json(),
    );
    expect(after).toMatchObject({ categoryId, categorySource: 'recurrence' });
  });

  it('answers GET /subscriptions: 200, not 404', async () => {
    await world.create({ name: 'Netflix', isSubscription: true, serviceSlug: 'netflix' });

    const response = await world.send('GET', '/subscriptions');

    expect(response.status).toBe(200);
    expect(listSubscriptionsResponseSchema.parse(await response.json())).toMatchObject({
      summary: { activeCount: 1, monthlyTotalCents: 10990, yearlyTotalCents: 131880 },
    });
  });

  it('puts the expected recurrence of a card in its invoice (the expectations reader)', async () => {
    await world.create({
      name: 'Netflix',
      accountId: world.card,
      method: 'credit',
      expectedAmountCents: 5590,
      dateRule: { type: 'fixed_day', day: 21 },
    });

    // 22/10 is after the closing of the 5th, so `2026-11` is the open invoice, and the 21st of
    // October (the occurrence of this month) falls in it.
    const response = await world.send('GET', `/cards/${world.card}/invoices/2026-11`);

    expect(response.status).toBe(200);
    const invoice = invoiceDetailDtoSchema.parse(await response.json());
    expect(invoice.breakdown.expectedRecurringCents).toBe(5590);
    expect(invoice.items).toContainEqual(
      expect.objectContaining({ type: 'expected_recurrence', recurrenceName: 'Netflix' }),
    );
  });

  it('offers the occurrences a transaction in review could settle (the candidates reader)', async () => {
    await world.create({
      kind: 'income',
      name: 'Mesada',
      expectedAmountCents: 85000,
      matchText: 'pai',
      maxPayments: 2,
      dateRule: { type: 'any_day' },
    });
    const pix = await insertTestIncome(world.database.db, world.checking, {
      cents: 60000,
      on: '2026-10-04',
      counterparty: 'PAI',
    });

    const response = await world.send('GET', '/transactions/review-queue');

    expect(response.status).toBe(200);
    const queue = reviewQueueDtoSchema.parse(await response.json());
    const item = queue.items.find((candidate) => candidate.transaction.id === pix);
    expect(item?.recurrenceCandidates).toEqual([
      expect.objectContaining({ recurrenceName: 'Mesada', month: '2026-10' }),
    ]);
  });

  it('refuses to pay an invoice with a transaction that already settles an occurrence (the linked reader)', async () => {
    const { occurrence } = await world.create({ name: 'Faturinha' });
    const debit = await insertTestExpense(world.database.db, world.checking, {
      cents: 10990,
      on: '2026-10-10',
    });
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: debit });

    const response = await world.send('POST', `/cards/${world.card}/invoices/2026-11/payments`, {
      amountCents: 10990,
      paidOn: '2026-10-10',
      transactionId: debit,
    });

    expect(response.status).toBe(409);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(
      'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('mounts the routes of recurrences, occurrences and subscriptions: they answer, they are not 404', async () => {
    for (const path of [
      '/recurrences?month=2026-10',
      '/recurrences/summary?month=2026-10',
      '/occurrences?month=2026-10',
      '/subscriptions',
    ]) {
      expect((await world.send('GET', path)).status).toBe(200);
    }
    const preview = await world.send('POST', '/recurrences/preview', {
      dateRule: { type: 'fixed_day', day: 25 },
    });
    expect(preview.status).toBe(200);
  });
});

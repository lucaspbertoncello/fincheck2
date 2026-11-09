import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { transactionSummaryDtoSchema } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import type { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetCardInvoiceTransactionsQuery } from '#/modules/transactions/application/card-invoice/get-card-invoice-transactions.query.ts';
import { ListCompetenceLinesQuery } from '#/modules/transactions/application/spending-line/list-competence-lines.query.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { createTransactionsTestApp } from '#tests/support/transactions/transaction/create-test-transactions-app.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const NOVEMBER = Month.of('2026-11');

// A credit on a card (a refund: a positive value on a card account). An expense category keeps it
// an expense that abates the spending; an income category makes it an income. Either way the credit
// lowers the invoice, which sums by value and not by nature.
describe('the category of a credit on a card, on the transactions routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: Hono;
  let cardId: string;
  let checkingId: string;
  let food: string;
  let salary: string;
  // Transactions the stubbed `links` reader says settle an occurrence.
  const occurrenceLinked = new Set<string>();

  beforeEach(async () => {
    occurrenceLinked.clear();
    database = await createTestDatabase();
    ({ app } = createTransactionsTestApp(database.db, {
      clock: createFixedClock(NOW),
      readers: {
        links: {
          linksOf(transactionIds) {
            const links = new Map();
            for (const id of transactionIds) {
              if (occurrenceLinked.has(id)) {
                links.set(id, {
                  occurrence: { occurrenceId: id, recurrenceName: 'Aluguel' },
                  bill: null,
                  invoicePayment: null,
                });
              }
            }

            return Promise.resolve(links);
          },
        },
      },
    }));
    cardId = await insertTestCreditCard(database.db);
    checkingId = await insertTestAccount(database.db, { name: 'Nubank' });
    food = await insertTestCategory(database.db, { name: 'Feira' });
    salary = await insertTestCategory(database.db, { name: 'Bônus de teste', kind: 'income' });
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

  const dtoOf = async (response: Response) => {
    expect(response.status).toBe(200);

    return transactionDtoSchema.parse(await response.json());
  };

  const get = async (id: string) => dtoOf(await send('GET', `/transactions/${id}`));
  const patch = (id: string, body: unknown) => send('PATCH', `/transactions/${id}`, body);

  // A credit on the card, born from the bank (the system's nature: an expense with a positive value).
  const credit = (cents = 3000, overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, cardId, {
      origin: 'bank',
      nature_set_by: 'system',
      method: 'credit',
      invoice_month: '2026-11',
      occurred_on: '2026-11-04',
      amount_cents: cents,
      description: 'Estorno',
      ...overrides,
    });

  // A purchase on the card: negative, on the same invoice.
  const purchase = (cents = -10000, overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, cardId, {
      method: 'credit',
      invoice_month: '2026-11',
      occurred_on: '2026-11-03',
      amount_cents: cents,
      ...overrides,
    });

  const invoiceTotal = async () => {
    const totals = (
      await new GetCardInvoiceTransactionsQuery(database.db).totalsByMonth(cardId, [NOVEMBER])
    ).get('2026-11');

    return (totals?.purchasesCents ?? 0) + (totals?.installmentsCents ?? 0);
  };

  const monthSummary = async () =>
    transactionSummaryDtoSchema.parse(
      await (await send('GET', '/transactions/summary?month=2026-11')).json(),
    );

  describe('PATCH /transactions/:id', () => {
    it('keeps an expense with the positive value when the category is an expense one', async () => {
      const id = await credit();

      expect(await dtoOf(await patch(id, { categoryId: food }))).toMatchObject({
        nature: 'expense',
        amountCents: 3000,
        categoryId: food,
        categorySource: 'user',
        isInReview: false,
      });
    });

    it('makes an income of it, set by the user, when the category is an income one', async () => {
      const id = await credit();

      const dto = await dtoOf(await patch(id, { categoryId: salary }));

      expect(dto).toMatchObject({
        nature: 'income',
        natureSetBy: 'user',
        amountCents: 3000,
        categoryId: salary,
        categorySource: 'user',
        isInReview: false,
      });
      expect(await get(id)).toMatchObject({ nature: 'income', categoryId: salary });
    });

    it('goes back to expense when the income category is taken off', async () => {
      const id = await credit();
      await patch(id, { categoryId: salary });

      expect(await dtoOf(await patch(id, { categoryId: null }))).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        amountCents: 3000,
        categoryId: null,
        isInReview: true,
      });
    });

    it('goes back to expense when an expense category replaces the income one', async () => {
      const id = await credit();
      await patch(id, { categoryId: salary });

      expect(await dtoOf(await patch(id, { categoryId: food }))).toMatchObject({
        nature: 'expense',
        amountCents: 3000,
        categoryId: food,
      });
    });

    it('keeps the income when the value is edited, and when the transaction is saved again', async () => {
      const id = await credit();
      await patch(id, { categoryId: salary });

      expect(await dtoOf(await patch(id, { amountCents: 4500 }))).toMatchObject({
        nature: 'income',
        natureSetBy: 'user',
        amountCents: 4500,
        categoryId: salary,
      });
    });

    it('takes both in the same request: the nature by hand first, then the income category', async () => {
      const id = await credit();

      expect(await dtoOf(await patch(id, { nature: 'expense', categoryId: salary }))).toMatchObject(
        { nature: 'income', categoryId: salary },
      );
    });

    it('refuses the income by hand on a card, but turns the income by category back into an expense', async () => {
      const refund = await credit();
      const income = await credit();
      await patch(income, { categoryId: salary });

      await expectError(await patch(refund, { nature: 'income' }), 400, 'VALIDATION_FAILED');
      expect(await dtoOf(await patch(income, { nature: 'expense' }))).toMatchObject({
        nature: 'expense',
        natureSetBy: 'user',
        amountCents: 3000,
        categoryId: null,
      });
    });

    it('still refuses an income category on a purchase on the card, and an expense on checking by kind', async () => {
      const debit = await purchase();
      const inflow = await insertTestTransaction(database.db, checkingId, {
        nature: 'income',
        amount_cents: 5000,
      });
      const refundOnChecking = await insertTestTransaction(database.db, checkingId, {
        amount_cents: 5000,
      });

      await expectError(
        await patch(debit, { categoryId: salary }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await patch(inflow, { categoryId: food }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await patch(refundOnChecking, { categoryId: salary }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      expect(await dtoOf(await patch(inflow, { categoryId: salary }))).toMatchObject({
        nature: 'income',
        categoryId: salary,
      });
      expect((await get(debit)).nature).toBe('expense');
    });

    it('refuses an archived category and leaves the credit as it was', async () => {
      const archived = await insertTestCategory(database.db, {
        kind: 'income',
        archived_at: NOW,
      });
      const id = await credit();

      await expectError(
        await patch(id, { categoryId: archived }),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      expect(await get(id)).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('keeps the lock of an occurrence', async () => {
      const id = await credit();
      occurrenceLinked.add(id);

      await expectError(
        await patch(id, { categoryId: salary }),
        422,
        'TRANSACTION_LINKED_TO_OCCURRENCE',
      );
      expect(await dtoOf(await patch(id, { categoryId: food }))).toMatchObject({
        nature: 'expense',
        categoryId: food,
      });
    });
  });

  describe('the invoice, the month and the lines by competence', () => {
    it('lowers the invoice by the credit for either kind of category, and by the same value', async () => {
      await purchase(-10000);
      const id = await credit(3000);
      expect(await invoiceTotal()).toBe(7000);

      await patch(id, { categoryId: food });
      expect(await invoiceTotal()).toBe(7000);
      await patch(id, { categoryId: salary });
      expect(await invoiceTotal()).toBe(7000);
      await patch(id, { categoryId: null });
      expect(await invoiceTotal()).toBe(7000);

      const items = await new GetCardInvoiceTransactionsQuery(database.db).itemsOf(
        cardId,
        NOVEMBER,
      );
      expect(items.map((item) => [item.amountCents, item.nature]).toSorted()).toEqual([
        [-10000, 'expense'],
        [3000, 'expense'],
      ]);
    });

    it('keeps the credit on the invoice, as an item with the nature income', async () => {
      await purchase(-10000);
      const id = await credit(3000);
      await patch(id, { categoryId: salary });

      const items = await new GetCardInvoiceTransactionsQuery(database.db).itemsOf(
        cardId,
        NOVEMBER,
      );

      expect(items.find((item) => item.transactionId === id)).toMatchObject({
        amountCents: 3000,
        nature: 'income',
        categoryId: salary,
      });
      expect(await invoiceTotal()).toBe(7000);
    });

    it('counts as less spending with an expense category and as income with an income one', async () => {
      await purchase(-10000);
      const id = await credit(3000);
      expect(await monthSummary()).toMatchObject({
        expensesCents: 7000,
        incomesCents: 0,
        reviewCount: 2,
      });

      await patch(id, { categoryId: food });
      expect(await monthSummary()).toMatchObject({
        expensesCents: 7000,
        incomesCents: 0,
        reviewCount: 1,
      });

      await patch(id, { categoryId: salary });
      expect(await monthSummary()).toMatchObject({
        expensesCents: 10000,
        incomesCents: 3000,
        reviewCount: 1,
      });

      await patch(id, { categoryId: null });
      expect(await monthSummary()).toMatchObject({ expensesCents: 7000, incomesCents: 0 });
    });

    it('gives the competence lines an income line for the income category, with its positive value', async () => {
      const id = await credit(3000);
      await patch(id, { categoryId: salary });
      const lines = new ListCompetenceLinesQuery(database.db);

      expect(await lines.listLines({ kind: 'income' })).toEqual([
        expect.objectContaining({ transactionId: id, kind: 'income', amountCents: 3000 }),
      ]);
      expect(await lines.listLines({ kind: 'expense' })).toEqual([]);

      await patch(id, { categoryId: food });

      expect(await lines.listLines({ kind: 'income' })).toEqual([]);
      expect(await lines.listLines({ kind: 'expense' })).toEqual([
        expect.objectContaining({ transactionId: id, kind: 'expense', amountCents: 3000 }),
      ]);
    });
  });

  describe('POST /transactions/bulk', () => {
    const bulk = async (transactionIds: string[], categoryId: string) => {
      const response = await send('POST', '/transactions/bulk', {
        transactionIds,
        action: { type: 'categorize', categoryId },
      });
      expect(response.status).toBe(200);

      return bulkTransactionsResultSchema.parse(await response.json());
    };

    it('categorizes several credits on the card as income, and skips what does not fit', async () => {
      const first = await credit(3000);
      const second = await credit(1200);
      const debit = await purchase();
      const linked = await credit(500);
      occurrenceLinked.add(linked);
      const inflow = await insertTestTransaction(database.db, checkingId, {
        nature: 'income',
        amount_cents: 700,
      });
      const outflow = await insertTestTransaction(database.db, checkingId);

      const result = await bulk([first, second, debit, linked, inflow, outflow], salary);

      expect(result.updatedCount).toBe(3);
      expect(result.skipped).toEqual([
        { transactionId: debit, reason: 'category_kind_mismatch' },
        { transactionId: linked, reason: 'outside_account' },
        { transactionId: outflow, reason: 'category_kind_mismatch' },
      ]);
      expect(await get(first)).toMatchObject({
        nature: 'income',
        natureSetBy: 'user',
        amountCents: 3000,
        categoryId: salary,
      });
      expect(await get(second)).toMatchObject({ nature: 'income', amountCents: 1200 });
      expect(await get(inflow)).toMatchObject({ nature: 'income', categoryId: salary });
      expect(await get(debit)).toMatchObject({ nature: 'expense', categoryId: null });
      expect(await get(linked)).toMatchObject({ nature: 'expense', categoryId: null });
      expect(await invoiceTotal()).toBe(10000 - 3000 - 1200 - 500);
    });

    it('categorizes credits on the card as expense, keeping the nature', async () => {
      const first = await credit(3000);
      const second = await credit(1200);
      await bulk([first], salary);

      const result = await bulk([first, second], food);

      expect(result.updatedCount).toBe(2);
      expect(await get(first)).toMatchObject({ nature: 'expense', categoryId: food });
      expect(await get(second)).toMatchObject({ nature: 'expense', categoryId: food });
    });

    it('undoes it: the credits go back to expense with no category', async () => {
      const first = await credit(3000);
      const second = await credit(1200);
      const result = await bulk([first, second], salary);

      const response = await send('POST', '/transactions/bulk/restore', { items: result.previous });

      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 2 });
      expect(await get(first)).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        categoryId: null,
      });
      expect(await get(second)).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('undoes a swap: the credit that was income goes back to income with its category', async () => {
      const id = await credit(3000);
      await bulk([id], salary);
      const swap = await bulk([id], food);
      expect(await get(id)).toMatchObject({ nature: 'expense', categoryId: food });

      const response = await send('POST', '/transactions/bulk/restore', { items: swap.previous });

      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 1 });
      expect(await get(id)).toMatchObject({
        nature: 'income',
        natureSetBy: 'user',
        categoryId: salary,
      });
    });
  });

  describe('what takes the nature back, and the links', () => {
    it('refuses to take the category off a credit that is income and tied to an occurrence', async () => {
      const id = await credit();
      await patch(id, { categoryId: salary });
      occurrenceLinked.add(id);

      await expectError(
        await patch(id, { categoryId: null }),
        422,
        'TRANSACTION_LINKED_TO_OCCURRENCE',
      );
      expect(await get(id)).toMatchObject({ nature: 'income', categoryId: salary });
    });

    it('splits a credit that is income by parts of income, and goes back to expense when the split is undone', async () => {
      const id = await credit(3000);
      await patch(id, { categoryId: salary });
      const other = await insertTestCategory(database.db, { name: 'Bônus 2', kind: 'income' });

      const split = await dtoOf(
        await send('PUT', `/transactions/${id}/splits`, {
          parts: [
            { amountCents: 2000, categoryId: salary },
            { amountCents: 1000, categoryId: other },
          ],
        }),
      );
      expect(split).toMatchObject({ nature: 'income', categoryId: null });
      expect(await monthSummary()).toMatchObject({ incomesCents: 3000 });

      const undone = await dtoOf(await send('DELETE', `/transactions/${id}/splits`));

      expect(undone).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        amountCents: 3000,
        categoryId: null,
        isInReview: true,
      });
      expect(await monthSummary()).toMatchObject({ incomesCents: 0 });
      expect(await invoiceTotal()).toBe(-3000);
    });

    it('refuses an expense part on a split of a credit that is income', async () => {
      const id = await credit(3000);
      await patch(id, { categoryId: salary });

      await expectError(
        await send('PUT', `/transactions/${id}/splits`, {
          parts: [{ amountCents: 2000, categoryId: food }, { amountCents: 1000 }],
        }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
    });

    it('leaves what a link locked as it is when the bulk action is undone, and counts only what went back', async () => {
      const tied = await credit(3000);
      const free = await credit(1200);
      const result = await (async () => {
        const response = await send('POST', '/transactions/bulk', {
          transactionIds: [tied, free],
          action: { type: 'categorize', categoryId: salary },
        });

        return bulkTransactionsResultSchema.parse(await response.json());
      })();
      occurrenceLinked.add(tied);

      const response = await send('POST', '/transactions/bulk/restore', { items: result.previous });

      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 1 });
      expect(await get(tied)).toMatchObject({ nature: 'income', categoryId: salary });
      expect(await get(free)).toMatchObject({ nature: 'expense', categoryId: null });
    });
  });
});

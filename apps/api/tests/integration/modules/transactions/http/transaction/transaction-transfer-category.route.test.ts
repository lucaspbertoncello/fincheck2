import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { createTransactionsTestApp } from '#tests/support/transactions/transaction/create-test-transactions-app.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';

// "Rotação entre contas": a category that is a transfer (`is_transfer`). Choosing it makes the
// transaction a `transfer` that keeps the category; taking it off gives the nature back by the sign.
describe('a category that is a transfer, on the transactions routes', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: Hono;
  let accountId: string;
  let rotation: string;
  let food: string;
  // Transactions the stubbed `links` reader says pay an occurrence or a bill.
  const occurrenceLinked = new Set<string>();
  const billLinked = new Set<string>();

  beforeEach(async () => {
    occurrenceLinked.clear();
    billLinked.clear();
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
              } else if (billLinked.has(id)) {
                links.set(id, {
                  occurrence: null,
                  bill: {
                    billId: id,
                    description: 'Dívida',
                    counterparty: null,
                    role: 'payment',
                    amountCents: 100,
                  },
                  invoicePayment: null,
                });
              }
            }

            return Promise.resolve(links);
          },
        },
      },
    }));
    accountId = await insertTestAccount(database.db, { name: 'Nubank' });
    rotation = await insertTestCategory(database.db, { name: 'Giro entre bancos', is_transfer: 1 });
    food = await insertTestCategory(database.db, { name: 'Feira' });
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

  describe('PATCH /transactions/:id', () => {
    it('makes an expense a transfer that keeps the category, by choice of the user, with no other leg', async () => {
      const id = await insertTestTransaction(database.db, accountId, { nature_set_by: 'system' });

      const dto = await dtoOf(await patch(id, { categoryId: rotation }));

      expect(dto).toMatchObject({
        nature: 'transfer',
        natureSetBy: 'user',
        categoryId: rotation,
        categorySource: 'user',
        transferCounterpartId: null,
        isInReview: false,
      });
      expect(await get(id)).toMatchObject({ nature: 'transfer', categoryId: rotation });
    });

    it('makes an income a transfer too', async () => {
      const id = await insertTestTransaction(database.db, accountId, {
        nature: 'income',
        amount_cents: 5000,
      });

      expect(await dtoOf(await patch(id, { categoryId: rotation }))).toMatchObject({
        nature: 'transfer',
        categoryId: rotation,
      });
    });

    it('goes back to expense by the sign when the category is taken off', async () => {
      const id = await insertTestTransaction(database.db, accountId);
      await patch(id, { categoryId: rotation });

      const dto = await dtoOf(await patch(id, { categoryId: null }));

      expect(dto).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        categoryId: null,
        categorySource: null,
        isInReview: true,
      });
    });

    it('goes back to income when the value is positive, and to expense on a card (a refund)', async () => {
      const income = await insertTestTransaction(database.db, accountId, {
        nature: 'income',
        amount_cents: 5000,
      });
      const cardId = await insertTestCreditCard(database.db);
      const refund = await insertTestTransaction(database.db, cardId, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 5000,
      });
      await patch(income, { categoryId: rotation });
      await patch(refund, { categoryId: rotation });

      expect((await dtoOf(await patch(income, { categoryId: null }))).nature).toBe('income');
      expect((await dtoOf(await patch(refund, { categoryId: null }))).nature).toBe('expense');
    });

    it('goes back by the sign and takes the ordinary category when replaced by one', async () => {
      const id = await insertTestTransaction(database.db, accountId);
      await patch(id, { categoryId: rotation });

      expect(await dtoOf(await patch(id, { categoryId: food }))).toMatchObject({
        nature: 'expense',
        categoryId: food,
        categorySource: 'user',
      });
    });

    it('cuts the link with the other leg on both sides when it goes back', async () => {
      const first = await insertTestTransaction(database.db, accountId, { amount_cents: -5000 });
      const otherAccount = await insertTestAccount(database.db, { name: 'Itaú' });
      const second = await insertTestTransaction(database.db, otherAccount, {
        nature: 'income',
        amount_cents: 5000,
      });
      await patch(first, { nature: 'transfer', transferCounterpartId: second });
      await patch(first, { categoryId: rotation });
      expect(await get(first)).toMatchObject({
        nature: 'transfer',
        categoryId: rotation,
        transferCounterpartId: second,
      });

      await patch(first, { categoryId: null });

      expect(await get(first)).toMatchObject({
        nature: 'expense',
        categoryId: null,
        transferCounterpartId: null,
      });
      expect((await get(second)).transferCounterpartId).toBeNull();
    });

    it('marks both legs of a rotation: the outgoing and the incoming one take the category', async () => {
      const out = await insertTestTransaction(database.db, accountId, { amount_cents: -5000 });
      const otherAccount = await insertTestAccount(database.db, { name: 'Itaú' });
      const into = await insertTestTransaction(database.db, otherAccount, {
        nature: 'income',
        amount_cents: 5000,
      });

      await patch(out, { categoryId: rotation });
      const dto = await dtoOf(await patch(into, { categoryId: rotation }));

      expect(dto).toMatchObject({ nature: 'transfer', categoryId: rotation });
    });

    it('links the other leg of a transfer that has the category without losing it', async () => {
      const out = await insertTestTransaction(database.db, accountId, { amount_cents: -5000 });
      const otherAccount = await insertTestAccount(database.db, { name: 'Itaú' });
      const into = await insertTestTransaction(database.db, otherAccount, {
        nature: 'income',
        amount_cents: 5000,
      });
      await patch(out, { categoryId: rotation });

      await dtoOf(await patch(out, { nature: 'transfer', transferCounterpartId: into }));

      expect(await get(out)).toMatchObject({
        nature: 'transfer',
        categoryId: rotation,
        transferCounterpartId: into,
      });
      expect((await get(into)).transferCounterpartId).toBe(out);
    });

    it.each(['lent', 'reimbursed', 'balance_adjustment'] as const)(
      'refuses a transaction whose nature is %s',
      async (nature) => {
        const id = await insertTestTransaction(database.db, accountId, { nature });

        await expectError(
          await patch(id, { categoryId: rotation }),
          422,
          'TRANSACTION_NATURE_LOCKED',
        );
        expect((await get(id)).nature).toBe(nature);
      },
    );

    it('refuses a transaction that settles an occurrence or pays a bill', async () => {
      const occurrence = await insertTestTransaction(database.db, accountId);
      const bill = await insertTestTransaction(database.db, accountId);
      occurrenceLinked.add(occurrence);
      billLinked.add(bill);

      await expectError(
        await patch(occurrence, { categoryId: rotation }),
        422,
        'TRANSACTION_LINKED_TO_OCCURRENCE',
      );
      await expectError(
        await patch(bill, { categoryId: rotation }),
        422,
        'TRANSACTION_LINKED_TO_BILL',
      );
      expect((await get(occurrence)).nature).toBe('expense');
    });

    it('creates a transfer when the new transaction names it', async () => {
      const response = await send('POST', '/transactions', {
        type: 'expense',
        accountId,
        method: 'pix',
        description: 'Rotação',
        amountCents: 1000,
        occurredOn: '2026-11-05',
        categoryId: rotation,
      });

      expect(response.status).toBe(201);
      expect(transactionDtoSchema.parse(await response.json())).toMatchObject({
        nature: 'transfer',
        categoryId: rotation,
        amountCents: -1000,
      });
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

    it('makes transfers of what is free, and skips what is locked, split or already a transfer', async () => {
      const expense = await insertTestTransaction(database.db, accountId);
      const income = await insertTestTransaction(database.db, accountId, {
        nature: 'income',
        amount_cents: 700,
      });
      const lent = await insertTestTransaction(database.db, accountId, { nature: 'lent' });
      const linked = await insertTestTransaction(database.db, accountId);
      occurrenceLinked.add(linked);
      const plain = await insertTestTransaction(database.db, accountId, { nature: 'transfer' });

      const result = await bulk([expense, income, lent, linked, plain], rotation);

      expect(result.updatedCount).toBe(2);
      expect(result.skipped).toEqual([
        { transactionId: lent, reason: 'outside_account' },
        { transactionId: linked, reason: 'outside_account' },
        { transactionId: plain, reason: 'outside_account' },
      ]);
      expect(await get(expense)).toMatchObject({ nature: 'transfer', categoryId: rotation });
      expect(await get(income)).toMatchObject({ nature: 'transfer', categoryId: rotation });
      expect(await get(linked)).toMatchObject({ nature: 'expense', categoryId: null });
      expect(await get(lent)).toMatchObject({ nature: 'lent', categoryId: null });
    });

    it('skips one that is already a transfer, and the undo gives the nature back by the sign', async () => {
      const expense = await insertTestTransaction(database.db, accountId);
      const income = await insertTestTransaction(database.db, accountId, {
        nature: 'income',
        amount_cents: 700,
      });
      const first = await bulk([expense, income], rotation);

      expect((await bulk([expense], rotation)).skipped).toEqual([
        { transactionId: expense, reason: 'outside_account' },
      ]);
      const response = await send('POST', '/transactions/bulk/restore', { items: first.previous });

      expect(restoreBulkResultSchema.parse(await response.json())).toEqual({ restoredCount: 2 });
      expect(await get(expense)).toMatchObject({ nature: 'expense', categoryId: null });
      expect(await get(income)).toMatchObject({ nature: 'income', categoryId: null });
    });

    it('the undo gives back the natureSetBy the transaction had', async () => {
      const fixed = await insertTestTransaction(database.db, accountId, { nature_set_by: 'user' });
      const detected = await insertTestTransaction(database.db, accountId, {
        nature_set_by: 'system',
      });
      const result = await bulk([fixed, detected], rotation);

      await send('POST', '/transactions/bulk/restore', { items: result.previous });

      expect(await get(fixed)).toMatchObject({ nature: 'expense', natureSetBy: 'user' });
      expect(await get(detected)).toMatchObject({ nature: 'expense', natureSetBy: 'system' });
    });
  });
});

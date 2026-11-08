import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetOccurrenceTransactionsQuery } from '#/modules/transactions/application/occurrence-payment/get-occurrence-transactions.query.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

describe('GetOccurrenceTransactionsQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: GetOccurrenceTransactionsQuery;
  let account: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new GetOccurrenceTransactionsQuery(database.db);
    account = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('answers what `recurrences` needs of the transactions that exist, by id', async () => {
    const income = await insertTestIncome(database.db, account, {
      cents: 42500,
      on: '2026-10-03',
      counterparty: 'PAI',
      description: 'Pix recebido',
    });

    const found = await query.findMany([income, income, 'nope']);

    expect([...found.keys()]).toEqual([income]);
    expect(found.get(income)).toEqual({
      id: income,
      accountId: account,
      amountCents: 42500,
      nature: 'income',
      isSplit: false,
      counts: true,
      occurredOn: '2026-10-03',
      description: 'Pix recebido',
      counterparty: 'PAI',
    });
  });

  it('says whether a transaction counts: not when ignored, not when the bank removed it without an edit', async () => {
    const ignored = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-03',
      overrides: { ignored_at: '2026-10-04T12:00:00.000Z' },
    });
    const removed = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-03',
      overrides: { bank_removed_at: '2026-10-04T12:00:00.000Z' },
    });
    const editedAfterRemoval = await insertTestExpense(database.db, account, {
      cents: 1,
      on: '2026-10-03',
      overrides: { bank_removed_at: '2026-10-04T12:00:00.000Z', description: 'Editada por mim' },
    });
    const normal = await insertTestExpense(database.db, account, { cents: 1, on: '2026-10-03' });

    const found = await query.findMany([ignored, removed, editedAfterRemoval, normal]);

    expect(
      [ignored, removed, editedAfterRemoval, normal].map((id) => found.get(id)?.counts),
    ).toEqual([false, false, true, true]);
  });

  it('tells a split transaction', async () => {
    const id = await insertTestExpense(database.db, account, { cents: 300, on: '2026-10-03' });
    await database.db
      .insertInto('transaction_splits')
      .values([
        {
          id: '019a0000-0000-7000-8000-0000000000a1',
          transaction_id: id,
          position: 1,
          amount_cents: -100,
          nature: 'expense',
          category_id: null,
          description: null,
        },
        {
          id: '019a0000-0000-7000-8000-0000000000a2',
          transaction_id: id,
          position: 2,
          amount_cents: -200,
          nature: 'expense',
          category_id: null,
          description: null,
        },
      ])
      .execute();

    expect((await query.requireOne(id)).isSplit).toBe(true);
  });

  it('throws TRANSACTION_NOT_FOUND from requireOne', async () => {
    await expect(query.requireOne('nope')).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' });
  });

  describe('findCandidates', () => {
    it('keeps the credits of nature income for an income and the debits of nature expense for an expense, that count, between the days', async () => {
      const income = await insertTestIncome(database.db, account, {
        cents: 5000,
        on: '2026-10-10',
      });
      const expense = await insertTestExpense(database.db, account, {
        cents: 5000,
        on: '2026-10-10',
      });
      await insertTestIncome(database.db, account, {
        cents: 5000,
        on: '2026-10-10',
        overrides: { ignored_at: '2026-10-11T12:00:00.000Z' },
      });
      await insertTestIncome(database.db, account, {
        cents: 5000,
        on: '2026-10-10',
        overrides: { nature: 'transfer' },
      });
      await insertTestExpense(database.db, account, {
        cents: 5000,
        on: '2026-10-10',
        overrides: { nature: 'invoice_payment' },
      });
      await insertTestIncome(database.db, account, { cents: 5000, on: '2026-09-30' });
      await insertTestIncome(database.db, account, { cents: 5000, on: '2026-10-21' });

      const incomes = await query.findCandidates({
        kind: 'income',
        from: '2026-10-01',
        to: '2026-10-20',
      });
      const expenses = await query.findCandidates({
        kind: 'expense',
        from: '2026-10-01',
        to: '2026-10-20',
      });

      expect(incomes.map((item) => item.id)).toEqual([income]);
      expect(expenses.map((item) => item.id)).toEqual([expense]);
    });

    it('includes the days at the edge of the range', async () => {
      const first = await insertTestIncome(database.db, account, { cents: 1, on: '2026-10-01' });
      const last = await insertTestIncome(database.db, account, { cents: 1, on: '2026-10-20' });

      const found = await query.findCandidates({
        kind: 'income',
        from: '2026-10-01',
        to: '2026-10-20',
      });

      expect(found.map((item) => item.id).toSorted()).toEqual([first, last].toSorted());
    });
  });
});

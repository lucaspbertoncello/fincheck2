import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import { GetBillTransactionsQuery } from '#/modules/transactions/application/bill-payment/get-bill-transactions.query.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Kysely<Database>;
let query: GetBillTransactionsQuery;
let accountId: string;

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
  query = new GetBillTransactionsQuery(db);
  accountId = await insertTestAccount(db);
});

afterEach(async () => {
  await database.destroy();
});

describe('GetBillTransactionsQuery', () => {
  it('reads what a bill needs of a transaction', async () => {
    const id = await insertTestIncome(db, accountId, {
      cents: 5800,
      on: '2026-11-04',
      counterparty: 'JULIA MENDES',
      description: 'Pix da Júlia',
    });

    const snapshot = await query.requireOne(id);

    expect(snapshot).toEqual({
      id,
      accountId,
      amountCents: 5800,
      nature: 'income',
      isSplit: false,
      counts: true,
      occurredOn: '2026-11-04',
      description: 'Pix da Júlia',
      bankDescription: 'Pix da Júlia',
      counterparty: 'JULIA MENDES',
      lentCents: 0,
    });
  });

  it('says it does not count when ignored or removed by the bank without an edit', async () => {
    const ignored = await insertTestExpense(db, accountId, {
      cents: 100,
      on: '2026-11-01',
      overrides: { ignored_at: '2026-11-02T00:00:00.000Z' },
    });
    const removed = await insertTestExpense(db, accountId, {
      cents: 100,
      on: '2026-11-01',
      overrides: { bank_removed_at: '2026-11-02T00:00:00.000Z' },
    });

    const found = await query.findMany([ignored, removed]);

    expect(found.get(ignored)?.counts).toBe(false);
    expect(found.get(removed)?.counts).toBe(false);
  });

  it('measures the part of a friend: the whole of a lent one, the lent parts of a split one', async () => {
    const whole = await insertTestExpense(db, accountId, {
      cents: 11600,
      on: '2026-11-01',
      overrides: { nature: 'lent' },
    });
    const split = await insertTestExpense(db, accountId, { cents: 23200, on: '2026-11-01' });
    await db
      .insertInto('transaction_splits')
      .values([
        {
          id: 'a',
          transaction_id: split,
          position: 1,
          amount_cents: -11600,
          nature: 'expense',
          category_id: null,
          description: null,
        },
        {
          id: 'b',
          transaction_id: split,
          position: 2,
          amount_cents: -5000,
          nature: 'lent',
          category_id: null,
          description: null,
        },
        {
          id: 'c',
          transaction_id: split,
          position: 3,
          amount_cents: -6600,
          nature: 'lent',
          category_id: null,
          description: null,
        },
      ])
      .execute();

    const found = await query.findMany([whole, split]);

    expect(found.get(whole)).toMatchObject({ lentCents: 11600, isSplit: false, nature: 'lent' });
    expect(found.get(split)).toMatchObject({ lentCents: 11600, isSplit: true });
  });

  it('answers only the ones that exist; requireOne throws TRANSACTION_NOT_FOUND', async () => {
    const id = await insertTestExpense(db, accountId, { cents: 100, on: '2026-11-01' });

    expect([...(await query.findMany([id, 'nope', id])).keys()]).toEqual([id]);
    expect(await query.findMany([])).toEqual(new Map());
    await expect(query.requireOne('nope')).rejects.toThrow(TransactionNotFoundError);
  });

  it('finds the candidates: the right way, nature, window, and that count', async () => {
    const inside = await insertTestExpense(db, accountId, { cents: 100, on: '2026-11-01' });
    await insertTestExpense(db, accountId, { cents: 100, on: '2026-09-01' });
    await insertTestIncome(db, accountId, { cents: 100, on: '2026-11-01' });
    await insertTestExpense(db, accountId, {
      cents: 100,
      on: '2026-11-01',
      overrides: { ignored_at: '2026-11-02T00:00:00.000Z' },
    });
    await insertTestExpense(db, accountId, {
      cents: 100,
      on: '2026-11-01',
      overrides: { nature: 'transfer' },
    });

    const expenses = await query.findCandidates({
      kind: 'expense',
      from: '2026-10-01',
      to: '2026-11-06',
    });
    const incomes = await query.findCandidates({
      kind: 'income',
      from: '2026-10-01',
      to: '2026-11-06',
    });

    expect(expenses.map((item) => item.id)).toEqual([inside]);
    expect(incomes).toHaveLength(1);
  });
});

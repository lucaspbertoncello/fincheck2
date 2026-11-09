import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Insertable } from 'kysely';

import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

const BILLS_TEST_NOW = '2026-11-06T15:00:00.000Z';

// The app `main` builds, on a real SQLite file, with the clock on 06/11/2026 (it moves one
// millisecond at each reading, so what is created later is later) and one checking account. `send` talks to it; `expense`, `income` and `bill` seed what a test needs.
export async function createBillsTestWorld(now: string = BILLS_TEST_NOW) {
  const database = await createTestDatabase();
  const db = database.db;
  let time = Date.parse(now);
  const clock = new SystemClock(() => {
    time += 1;

    return time;
  });
  const app = createTestApp(db, { clock });
  const accountId = await insertTestAccount(db);

  const send = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    app.request(path, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  const world = {
    database,
    db,
    app,
    accountId,
    send,
    destroy: () => database.destroy(),

    expense: (
      cents: number,
      on: string,
      extra: { description?: string; overrides?: Partial<Insertable<TransactionsTable>> } = {},
    ) => insertTestExpense(db, accountId, { cents, on, ...extra }),

    income: (
      cents: number,
      on: string,
      extra: {
        counterparty?: string | null;
        description?: string;
        overrides?: Partial<Insertable<TransactionsTable>>;
      } = {},
    ) => insertTestIncome(db, accountId, { cents, on, ...extra }),

    category: (kind: 'expense' | 'income' = 'expense') => insertTestCategory(db, { kind }),

    // POST /bills, expecting a 201.
    async bill(body: Record<string, unknown>): Promise<Bill.Dto> {
      const response = await send('POST', '/bills', {
        direction: 'payable',
        kind: 'general',
        description: 'Conta de luz',
        amountCents: 45000,
        ...body,
      });
      if (response.status !== 201) {
        throw new Error(
          `POST /bills answered ${String(response.status)}: ${await response.text()}`,
        );
      }

      return billDtoSchema.parse(await response.json());
    },

    // The row of a transaction with its parts, as the database holds it.
    async transaction(id: string) {
      const row = await db
        .selectFrom('transactions')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
      const splits = await db
        .selectFrom('transaction_splits')
        .selectAll()
        .where('transaction_id', '=', id)
        .orderBy('position')
        .execute();

      return { ...row, splits };
    },
  };

  return world;
}

export type BillsTestWorld = Awaited<ReturnType<typeof createBillsTestWorld>>;

import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { createRecurrenceResponseSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Insertable } from 'kysely';
import { expect } from 'vitest';

import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// 22/10/2026 12:00 in São Paulo: the day of the screen the contract uses as example (BR-DSH-011).
const DASHBOARD_TEST_NOW = '2026-10-22T15:00:00.000Z';

// The API as `main` builds it, over a SQLite file, with a clock stopped at `instant` and the seeds
// the dashboard reads: accounts and cards, transactions, categories, bills and recurrences (these
// two through their own routes, so what is read is what the app would have). `at` builds another
// app over the same database with another clock.
export async function createDashboardTestWorld(instant: string = DASHBOARD_TEST_NOW) {
  const database = await createTestDatabase();
  const db = database.db;

  const sender = (clockInstant: string) => {
    const app = createTestApp(db, { clock: createFixedClock(clockInstant) });

    return (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
      app.request(path, {
        method,
        headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
  };
  const send = sender(instant);

  const world = {
    database,
    db,
    send,
    at: sender,
    destroy: () => database.destroy(),

    // A bank account (Pluggy) with the balance the bank sent; `null` is "no balance yet".
    bankAccount: (name: string, balanceCents: number | null, overrides = {}) =>
      insertTestAccount(db, {
        name,
        source: 'pluggy',
        institution_code: 'other',
        bank_balance_cents: balanceCents,
        bank_balance_at: balanceCents === null ? null : '2026-10-22T12:00:00.000Z',
        ...overrides,
      }),

    // A manual account (its balance is the sum of its transactions).
    manualAccount: (name: string, overrides = {}) => insertTestAccount(db, { name, ...overrides }),

    // A manual card with its cycle.
    async card(name: string, closingDay: number, dueDay: number): Promise<string> {
      const id = await insertTestAccount(db, { name, type: 'credit_card' });
      await db
        .insertInto('credit_cards')
        .values({
          account_id: id,
          brand: 'visa',
          last4: '1234',
          closing_day: closingDay,
          due_day: dueDay,
          limit_cents: null,
          theme_id: null,
        })
        .execute();

      return id;
    },

    category: (kind: 'expense' | 'income' = 'expense', name?: string) =>
      insertTestCategory(db, { kind, ...(name ? { name } : {}) }),

    // A debit the bank sent (an `expense`).
    expense: (
      accountId: string,
      cents: number,
      on: string,
      extra: {
        description?: string;
        categoryId?: string | null;
        overrides?: Partial<Insertable<TransactionsTable>>;
      } = {},
    ) =>
      insertTestExpense(db, accountId, {
        cents,
        on,
        ...(extra.description ? { description: extra.description } : {}),
        overrides: { category_id: extra.categoryId ?? null, ...extra.overrides },
      }),

    // A credit the bank sent (an `income`).
    income: (
      accountId: string,
      cents: number,
      on: string,
      extra: {
        description?: string;
        counterparty?: string | null;
        categoryId?: string | null;
        overrides?: Partial<Insertable<TransactionsTable>>;
      } = {},
    ) =>
      insertTestIncome(db, accountId, {
        cents,
        on,
        ...(extra.description ? { description: extra.description } : {}),
        counterparty: extra.counterparty ?? null,
        overrides: { category_id: extra.categoryId ?? null, ...extra.overrides },
      }),

    // A purchase on a card, in the invoice `invoiceMonth`.
    purchase: (
      cardId: string,
      cents: number,
      on: string,
      invoiceMonth: string,
      extra: { description?: string; categoryId?: string | null } = {},
    ) =>
      insertTestTransaction(db, cardId, {
        origin: 'bank',
        method: 'credit',
        nature: 'expense',
        nature_set_by: 'system',
        description: extra.description ?? 'Compra',
        amount_cents: -cents,
        occurred_on: on,
        invoice_month: invoiceMonth,
        category_id: extra.categoryId ?? null,
      }),

    // What the import detectors mark as the payment of an invoice: the debit on an own account.
    invoicePaymentDebit: (accountId: string, cents: number, on: string) =>
      insertTestTransaction(db, accountId, {
        origin: 'bank',
        method: 'debit',
        nature: 'invoice_payment',
        nature_set_by: 'system',
        description: 'PAGAMENTO FATURA',
        amount_cents: -cents,
        occurred_on: on,
      }),

    // POST /bills, expecting a 201.
    async bill(body: Record<string, unknown>, request: typeof send = send): Promise<Bill.Dto> {
      const response = await request('POST', '/bills', {
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

    // POST /recurrences, expecting a 201; answers the recurrence and its occurrence of the month.
    async recurrence(body: Record<string, unknown>, request: typeof send = send) {
      const response = await request('POST', '/recurrences', {
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 10 },
        startsMonth: '2026-10',
        ...body,
      });
      if (response.status !== 201) {
        throw new Error(
          `POST /recurrences answered ${String(response.status)}: ${await response.text()}`,
        );
      }

      return createRecurrenceResponseSchema.parse(await response.json());
    },

    // GET answering 200 with the body parsed by `schema`.
    async get<Schema extends { parse: (value: unknown) => unknown }>(
      path: string,
      schema: Schema,
      request: typeof send = send,
    ): Promise<ReturnType<Schema['parse']>> {
      const response = await request('GET', path);
      expect(response.status, `${path}: ${await response.clone().text()}`).toBe(200);

      return schema.parse(await response.json()) as ReturnType<Schema['parse']>;
    },

    expectError: async (response: Response, status: number, code: string) => {
      expect(response.status).toBe(status);
      expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
    },
  };

  return world;
}

export type DashboardTestWorld = Awaited<ReturnType<typeof createDashboardTestWorld>>;

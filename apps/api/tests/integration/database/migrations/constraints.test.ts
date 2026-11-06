import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// A sample of what the database itself refuses, one CHECK per block, a RESTRICT, a UNIQUE and a
// CASCADE. The schema is the last line of defense: the domain validates first.
describe('database constraints', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  const db = () => database.db;

  describe('CHECK', () => {
    it('categories: refuses a rule with no text condition', async () => {
      await expect(
        sql`insert into category_rules (id, enabled, created_at, updated_at)
            values (${generateId()}, 1, ${NOW}, ${NOW})`.execute(db()),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block A: refuses a wallet that is not manual', async () => {
      await expect(insertTestAccount(db(), { type: 'wallet', source: 'pluggy' })).rejects.toThrow(
        /CHECK constraint failed/,
      );
    });

    it('block A: refuses a manual account with a bank balance', async () => {
      await expect(insertTestAccount(db(), { bank_balance_cents: 1000 })).rejects.toThrow(
        /CHECK constraint failed/,
      );
    });

    it('block A: refuses a category on a transfer', async () => {
      const accountId = await insertTestAccount(db());
      const categoryId = await insertTestCategory(db());

      await expect(
        insertTestTransaction(db(), accountId, { nature: 'transfer', category_id: categoryId }),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block A: refuses a date that does not exist', async () => {
      const accountId = await insertTestAccount(db());

      await expect(
        insertTestTransaction(db(), accountId, { occurred_on: '2026-02-30' }),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block A: refuses an installment number without its plan', async () => {
      const accountId = await insertTestAccount(db());

      await expect(
        insertTestTransaction(db(), accountId, { installment_number: 3 }),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block B: refuses a fixed-day recurrence without a day', async () => {
      await expect(
        sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode,
              date_rule, non_business_day_shift, max_payments, starts_month, created_at, updated_at)
            values (${generateId()}, 'expense', 'Aluguel', 100000, 'fixed', 'fixed_day', 'none', 1,
              '2026-11', ${NOW}, ${NOW})`.execute(db()),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block B: refuses a business-day recurrence that carries a weekend shift', async () => {
      await expect(
        sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode,
              date_rule, business_day_number, non_business_day_shift, max_payments, starts_month,
              created_at, updated_at)
            values (${generateId()}, 'income', 'Salário', 500000, 'fixed', 'business_day', 5, 'after',
              1, '2026-11', ${NOW}, ${NOW})`.execute(db()),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block B: refuses an income recurrence marked as a subscription', async () => {
      await expect(
        sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode,
              date_rule, max_payments, starts_month, is_subscription, created_at, updated_at)
            values (${generateId()}, 'income', 'Mesada', 85000, 'fixed', 'any_day', 1, '2026-11', 1,
              ${NOW}, ${NOW})`.execute(db()),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block B: refuses a service slug on a recurrence that is not a subscription', async () => {
      await expect(
        sql`insert into recurrences (id, kind, name, expected_amount_cents, amount_mode,
              date_rule, max_payments, starts_month, service_slug, created_at, updated_at)
            values (${generateId()}, 'expense', 'Netflix', 5590, 'fixed', 'any_day', 1, '2026-11',
              'netflix', ${NOW}, ${NOW})`.execute(db()),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block B: refuses a bill with a friend kind and no counterparty', async () => {
      await expect(
        sql`insert into bills (id, direction, kind, description, amount_cents, created_at, updated_at)
            values (${generateId()}, 'receivable', 'friend', 'Ingresso', 45000, ${NOW}, ${NOW})`.execute(
          db(),
        ),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block C: refuses a second row in a single-row table', async () => {
      await expect(
        sql`insert into profile (id, name, initials, updated_at) values (2, 'Outro', 'O', ${NOW})`.execute(
          db(),
        ),
      ).rejects.toThrow(/CHECK constraint failed/);
    });

    it('block C: refuses a negative count in a sync run', async () => {
      const connectionId = generateId();
      await sql`insert into sync_connections (id, pluggy_item_id, institution_code, institution_name,
                  status, history_status, created_at, updated_at)
                values (${connectionId}, 'item-1', 'nubank', 'Nubank', 'active', 'pending', ${NOW}, ${NOW})`.execute(
        db(),
      );

      await expect(
        sql`insert into sync_runs (id, connection_id, "trigger", started_at, status, created_count,
                  updated_count, removed_count)
                values (${generateId()}, ${connectionId}, 'schedule', ${NOW}, 'running', -1, 0, 0)`.execute(
          db(),
        ),
      ).rejects.toThrow(/CHECK constraint failed/);
    });
  });

  describe('STRICT', () => {
    it('refuses text in an integer column', async () => {
      const accountId = await insertTestAccount(db());

      await expect(
        insertTestTransaction(db(), accountId, { amount_cents: 'abc' as unknown as number }),
      ).rejects.toThrow(/cannot store TEXT value in INTEGER column/);
    });
  });

  describe('FOREIGN KEY', () => {
    it('RESTRICT: refuses to delete an account that has transactions', async () => {
      const accountId = await insertTestAccount(db());
      await insertTestTransaction(db(), accountId);

      await expect(
        db().deleteFrom('accounts').where('id', '=', accountId).execute(),
      ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    });

    it('RESTRICT: refuses to delete a category used by a transaction', async () => {
      const accountId = await insertTestAccount(db());
      const categoryId = await insertTestCategory(db());
      await insertTestTransaction(db(), accountId, { category_id: categoryId });

      await expect(
        db().deleteFrom('categories').where('id', '=', categoryId).execute(),
      ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    });

    it('refuses a transaction of an account that does not exist', async () => {
      await expect(insertTestTransaction(db(), generateId())).rejects.toThrow(
        /FOREIGN KEY constraint failed/,
      );
    });

    it('SET NULL: deleting a transaction clears the counterpart of its transfer', async () => {
      const accountId = await insertTestAccount(db());
      const first = await insertTestTransaction(db(), accountId, { nature: 'transfer' });
      const second = await insertTestTransaction(db(), accountId, {
        nature: 'transfer',
        transfer_counterpart_id: first,
      });

      await db().deleteFrom('transactions').where('id', '=', first).execute();

      const row = await db()
        .selectFrom('transactions')
        .select('transfer_counterpart_id')
        .where('id', '=', second)
        .executeTakeFirstOrThrow();
      expect(row.transfer_counterpart_id).toBeNull();
    });

    it('CASCADE: deleting an account takes its credit card along', async () => {
      const accountId = await insertTestAccount(db(), { type: 'credit_card' });
      await db()
        .insertInto('credit_cards')
        .values({
          account_id: accountId,
          brand: 'visa',
          last4: '1234',
          closing_day: 30,
          due_day: 6,
          limit_cents: null,
          theme_id: null,
        })
        .execute();

      await db().deleteFrom('accounts').where('id', '=', accountId).execute();

      expect(await db().selectFrom('credit_cards').selectAll().execute()).toEqual([]);
    });
  });

  describe('UNIQUE', () => {
    it('refuses two invoices of the same card and month', async () => {
      const accountId = await insertTestAccount(db(), { type: 'credit_card' });
      const insertInvoice = () =>
        sql`insert into invoices (id, account_id, month, closes_on, due_on, created_at, updated_at)
            values (${generateId()}, ${accountId}, '2026-10', '2026-10-30', '2026-11-06', ${NOW}, ${NOW})`.execute(
          db(),
        );
      await insertInvoice();

      await expect(insertInvoice()).rejects.toThrow(/UNIQUE constraint failed/);
    });

    it('refuses a category name that repeats in the same kind, whatever the case', async () => {
      await insertTestCategory(db(), { kind: 'expense', name: 'Restaurantes' });

      await expect(
        insertTestCategory(db(), { kind: 'expense', name: 'RESTAURANTES' }),
      ).rejects.toThrow(/UNIQUE constraint failed/);
      await expect(
        insertTestCategory(db(), { kind: 'income', name: 'Restaurantes' }),
      ).resolves.toBeDefined();
    });

    it('refuses the same installment twice, but lets plain transactions be many', async () => {
      const accountId = await insertTestAccount(db(), { type: 'credit_card' });
      const planId = generateId();
      await sql`insert into installment_plans (id, account_id, origin, description, purchase_on,
                  total_cents, installment_count, first_invoice_month, created_at, updated_at)
                values (${planId}, ${accountId}, 'manual', 'Cadeira', '2026-08-10', 320000, 10,
                  '2026-09', ${NOW}, ${NOW})`.execute(db());
      await insertTestTransaction(db(), accountId, {
        installment_plan_id: planId,
        installment_number: 3,
      });

      await expect(
        insertTestTransaction(db(), accountId, {
          installment_plan_id: planId,
          installment_number: 3,
        }),
      ).rejects.toThrow(/UNIQUE constraint failed/);
      await insertTestTransaction(db(), accountId);
      await expect(insertTestTransaction(db(), accountId)).resolves.toBeDefined();
    });
  });
});

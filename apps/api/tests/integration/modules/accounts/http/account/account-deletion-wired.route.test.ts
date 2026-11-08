import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// `GET /accounts/:id/deletion-impact` and `DELETE /accounts/:id` as `main` mounts them, with the
// real owners: `invoices`, `transactions` and `categories`, all in one unit of work.
describe('deletion of an account, with the real owners', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;
  let plan: string;
  let ruleId: string;
  let debit: string;

  const count = async (
    table:
      | 'accounts'
      | 'transactions'
      | 'installment_plans'
      | 'invoices'
      | 'invoice_payments'
      | 'category_rules'
      | 'credit_cards',
  ) => (await world.database.db.selectFrom(table).selectAll().execute()).length;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
    const db = world.database.db;
    plan = await insertTestInstallmentPlan(db, world.card, { installment_count: 2 });
    for (const [number, month] of [
      [1, '2026-10'],
      [2, '2026-11'],
    ] as const) {
      await insertTestTransaction(db, world.card, {
        method: 'credit',
        invoice_month: month,
        amount_cents: -5000,
        installment_plan_id: plan,
        installment_number: number,
      });
    }
    await insertTestTransaction(db, world.card, {
      method: 'credit',
      invoice_month: '2026-12',
      amount_cents: -1000,
    });
    // An invoice with a row, paid by a debit of the checking account.
    debit = await insertTestTransaction(db, world.checking, {
      amount_cents: -5000,
      occurred_on: '2026-11-10',
      description: 'PAGAMENTO FATURA',
    });
    await world.send('POST', `/cards/${world.card}/invoices/2026-11/payments`, {
      amountCents: 5000,
      paidOn: '2026-11-10',
      transactionId: debit,
    });
    const category = await insertTestCategory(db, { name: 'Regra teste' });
    ruleId = generateId();
    await db
      .insertInto('category_rules')
      .values([
        {
          id: ruleId,
          description_contains: 'MERCADO',
          counterparty_contains: null,
          kind: null,
          account_id: world.card,
          amount_min_cents: null,
          amount_max_cents: null,
          category_id: category,
          enabled: 1,
          created_at: '2026-11-01T00:00:00.000Z',
          updated_at: '2026-11-01T00:00:00.000Z',
        },
        {
          id: generateId(),
          description_contains: 'PADARIA',
          counterparty_contains: null,
          kind: null,
          account_id: null,
          amount_min_cents: null,
          amount_max_cents: null,
          category_id: category,
          enabled: 1,
          created_at: '2026-11-01T00:00:00.000Z',
          updated_at: '2026-11-01T00:00:00.000Z',
        },
      ])
      .execute();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  it('counts what the deletion of the card takes: transactions, plans, invoices and rules', async () => {
    const response = await world.send('GET', `/accounts/${world.card}/deletion-impact`);

    expect(response.status).toBe(200);
    // 3 purchases of the card; the invoices are the months with a row or a purchase (2026-10,
    // 2026-11 and 2026-12).
    expect(deletionImpactDtoSchema.parse(await response.json())).toEqual({
      transactionCount: 3,
      installmentPlanCount: 1,
      invoiceCount: 3,
      ruleCount: 1,
      isPluggy: false,
      returnsOnNextSync: false,
    });
  });

  it('counts only the transactions of a checking account, with no plans, invoices or rules', async () => {
    const response = await world.send('GET', `/accounts/${world.checking}/deletion-impact`);

    expect(deletionImpactDtoSchema.parse(await response.json())).toEqual({
      transactionCount: 1,
      installmentPlanCount: 0,
      invoiceCount: 0,
      ruleCount: 0,
      isPluggy: false,
      returnsOnNextSync: false,
    });
  });

  it('answers 404 for an account that does not exist and 400 for an id that is not one', async () => {
    await world.expectError(
      await world.send('GET', `/accounts/${generateId()}/deletion-impact`),
      404,
      'ACCOUNT_NOT_FOUND',
    );
    await world.expectError(
      await world.send('DELETE', `/accounts/${generateId()}`),
      404,
      'ACCOUNT_NOT_FOUND',
    );
    await world.expectError(await world.send('DELETE', '/accounts/abc'), 400, 'VALIDATION_FAILED');
  });

  it('deletes the card with its invoices, plans, transactions and rules, and gives the debit that paid back its place', async () => {
    const response = await world.send('DELETE', `/accounts/${world.card}`);

    expect(response.status).toBe(204);
    expect(await count('credit_cards')).toBe(0);
    expect(await count('installment_plans')).toBe(0);
    expect(await count('invoices')).toBe(0);
    expect(await count('invoice_payments')).toBe(0);
    // Only the rule with a condition on the card goes; the other one stays.
    expect(
      (await world.database.db.selectFrom('category_rules').select('id').execute()).map(
        (r) => r.id,
      ),
    ).not.toContain(ruleId);
    expect(await count('category_rules')).toBe(1);
    // The checking account and its debit stay; Lucas had turned it into the payment, so it is an
    // expense again.
    const remaining = await world.database.db
      .selectFrom('transactions')
      .select(['id', 'nature', 'nature_set_by'])
      .execute();
    expect(remaining).toEqual([{ id: debit, nature: 'expense', nature_set_by: 'system' }]);
    expect(await count('accounts')).toBe(1);
  });

  it('the other leg of a transfer goes back to expense by its sign when the account is deleted', async () => {
    const db = world.database.db;
    const savings = await insertTestAccount(db, { name: 'Poupança', type: 'savings' });
    const out = await insertTestTransaction(db, savings, {
      amount_cents: -2000,
      nature: 'transfer',
    });
    const into = await insertTestTransaction(db, world.checking, {
      amount_cents: 2000,
      nature: 'transfer',
      transfer_counterpart_id: out,
    });
    await db
      .updateTable('transactions')
      .set({ transfer_counterpart_id: into })
      .where('id', '=', out)
      .execute();

    expect((await world.send('DELETE', `/accounts/${savings}`)).status).toBe(204);

    const other = await db
      .selectFrom('transactions')
      .select(['nature', 'transfer_counterpart_id'])
      .where('id', '=', into)
      .executeTakeFirstOrThrow();
    expect(other).toEqual({ nature: 'income', transfer_counterpart_id: null });
  });

  describe('all or nothing (one unit of work)', () => {
    const failOnDelete = (table: string) =>
      sql
        .raw(
          `CREATE TRIGGER fail_${table} BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT, 'boom'); END`,
        )
        .execute(world.database.db);

    const expectUntouched = async () => {
      expect(await count('accounts')).toBe(2);
      expect(await count('credit_cards')).toBe(1);
      expect(await count('transactions')).toBe(4);
      expect(await count('installment_plans')).toBe(1);
      expect(await count('invoices')).toBe(1);
      expect(await count('invoice_payments')).toBe(1);
      expect(await count('category_rules')).toBe(2);
      // The debit is still the payment Lucas linked.
      expect(
        (
          await world.database.db
            .selectFrom('transactions')
            .select('nature')
            .where('id', '=', debit)
            .executeTakeFirstOrThrow()
        ).nature,
      ).toBe('invoice_payment');
    };

    it('the failure of the last owner (the rules) deletes nothing of the invoices nor of the transactions', async () => {
      await failOnDelete('category_rules');

      const response = await world.send('DELETE', `/accounts/${world.card}`);

      expect(response.status).toBe(500);
      await expectUntouched();
    });

    it('the failure of the account itself deletes nothing of what the owners had already deleted', async () => {
      await failOnDelete('accounts');

      const response = await world.send('DELETE', `/accounts/${world.card}`);

      expect(response.status).toBe(500);
      await expectUntouched();
    });

    it('the failure of the first owner (the invoices) deletes nothing', async () => {
      await failOnDelete('invoices');

      const response = await world.send('DELETE', `/accounts/${world.card}`);

      expect(response.status).toBe(500);
      await expectUntouched();
    });
  });
});

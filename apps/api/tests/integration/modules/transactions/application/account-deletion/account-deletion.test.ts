import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { createTransactionsModule } from '#/main/http/create-transactions-module.util.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The side of `transactions` in the deletion of an account (ports of `accounts`). The routes of the
// deletion wait for `invoices` and `categories`; these ports are ready for when they are mounted.
describe('what deleting an account takes from transactions', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let ports: ReturnType<typeof createTransactionsModule>['accountPorts'];
  let unitOfWork: KyselyUnitOfWork;

  beforeEach(async () => {
    database = await createTestDatabase();
    unitOfWork = new KyselyUnitOfWork(database.db);
    ports = createTransactionsModule({
      db: database.db,
      unitOfWork,
      clock: createFixedClock('2026-11-06T15:00:00.000Z'),
      accounts: new GetAccountRefQuery(new KyselyAccountRepository(database.db)),
    }).accountPorts;
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('counts every transaction, the ignored ones too, and the plans', async () => {
    const card = await insertTestCreditCard(database.db);
    const account = await insertTestAccount(database.db);
    const plan = await insertTestInstallmentPlan(database.db, card);
    await insertTestTransaction(database.db, card, {
      method: 'credit',
      invoice_month: '2026-11',
      installment_plan_id: plan,
      installment_number: 1,
    });
    await insertTestTransaction(database.db, card, {
      method: 'credit',
      ignored_at: '2026-11-01T00:00:00.000Z',
    });
    await insertTestTransaction(database.db, account);

    expect(await ports.transactionCounts.countsOf(card)).toEqual({
      transactionCount: 2,
      installmentPlanCount: 1,
    });
    expect(await ports.transactionCounts.countsOf(account)).toEqual({
      transactionCount: 1,
      installmentPlanCount: 0,
    });
  });

  it("deletes the transactions and the plans of the account and nobody else's", async () => {
    const card = await insertTestCreditCard(database.db);
    const account = await insertTestAccount(database.db);
    const plan = await insertTestInstallmentPlan(database.db, card);
    await insertTestTransaction(database.db, card, {
      method: 'credit',
      invoice_month: '2026-11',
      installment_plan_id: plan,
      installment_number: 1,
    });
    await insertTestTransaction(database.db, card, { method: 'credit' });
    const kept = await insertTestTransaction(database.db, account);

    await unitOfWork.run((executor) => ports.deleteTransactions.execute(card, executor));

    expect(
      (await database.db.selectFrom('transactions').select('id').execute()).map((row) => row.id),
    ).toEqual([kept]);
    expect(await database.db.selectFrom('installment_plans').select('id').execute()).toEqual([]);
  });

  it('gives the other leg of a transfer back by its sign, so it counts again', async () => {
    const checking = await insertTestAccount(database.db, { name: 'Corrente' });
    const savings = await insertTestAccount(database.db, { name: 'Poupança', type: 'savings' });
    const out = await insertTestTransaction(database.db, checking, {
      nature: 'transfer',
      amount_cents: -5000,
    });
    const into = await insertTestTransaction(database.db, savings, {
      nature: 'transfer',
      amount_cents: 5000,
      transfer_counterpart_id: out,
    });
    await database.db
      .updateTable('transactions')
      .set({ transfer_counterpart_id: into })
      .where('id', '=', out)
      .execute();

    await unitOfWork.run((executor) => ports.deleteTransactions.execute(checking, executor));

    const freed = await database.db
      .selectFrom('transactions')
      .select(['nature', 'nature_set_by', 'transfer_counterpart_id'])
      .where('id', '=', into)
      .executeTakeFirstOrThrow();
    expect(freed).toEqual({
      nature: 'income',
      nature_set_by: 'system',
      transfer_counterpart_id: null,
    });
  });

  it('gives a refund on a card back as an expense, never as income', async () => {
    const checking = await insertTestAccount(database.db, { name: 'Corrente' });
    const card = await insertTestCreditCard(database.db);
    const out = await insertTestTransaction(database.db, checking, {
      nature: 'transfer',
      amount_cents: -5000,
    });
    const credit = await insertTestTransaction(database.db, card, {
      method: 'credit',
      nature: 'transfer',
      amount_cents: 5000,
      invoice_month: '2026-11',
      transfer_counterpart_id: out,
    });
    await database.db
      .updateTable('transactions')
      .set({ transfer_counterpart_id: credit })
      .where('id', '=', out)
      .execute();

    await unitOfWork.run((executor) => ports.deleteTransactions.execute(checking, executor));

    const freed = await database.db
      .selectFrom('transactions')
      .select('nature')
      .where('id', '=', credit)
      .executeTakeFirstOrThrow();
    expect(freed.nature).toBe('expense');
  });
});

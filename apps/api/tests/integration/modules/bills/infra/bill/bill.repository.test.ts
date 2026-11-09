import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { KyselyBillRepository } from '#/modules/bills/infra/bill/bill.repository.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const LATER = '2026-11-07T15:00:00.000Z';

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let db: Kysely<Database>;
let repository: KyselyBillRepository;
let accountId: string;

beforeEach(async () => {
  database = await createTestDatabase();
  db = database.db;
  repository = new KyselyBillRepository(db);
  accountId = await insertTestAccount(db);
});

afterEach(async () => {
  await database.destroy();
});

const expense = (cents = 1000) => insertTestExpense(db, accountId, { cents, on: '2026-11-01' });

function newBill(patch: Partial<Bill.CreateInput> = {}): Bill {
  return Bill.create(
    {
      direction: 'payable',
      kind: 'friend',
      description: 'Ingresso do show',
      counterparty: 'Rafa',
      amount: Money.fromCents(45000),
      dueOn: BusinessDate.of('2026-10-31'),
      category: null,
      originTransactionId: null,
      ...patch,
    },
    NOW,
  );
}

describe('KyselyBillRepository', () => {
  it('saves and reads the bill as it was, with its payments and dismissals', async () => {
    const categoryId = await insertTestCategory(db);
    const paidBy = await expense(15000);
    const dismissed = await expense(500);
    const bill = newBill({ category: { id: categoryId, kind: 'expense', isArchived: false } });
    bill.addPayment(
      {
        transactionId: paidBy,
        amount: Money.fromCents(15000),
        paidOn: BusinessDate.of('2026-11-03'),
      },
      Money.zero(),
      NOW,
    );
    bill.addPayment(
      { transactionId: null, amount: Money.fromCents(100), paidOn: BusinessDate.of('2026-11-04') },
      Money.fromCents(15000),
      LATER,
    );
    bill.dismissPaymentSuggestion(dismissed, NOW);

    await repository.save(bill);
    const read = await repository.findById(bill.id);

    expect(read).toEqual(bill);
    expect(read?.payments.map((payment) => payment.amount.cents)).toEqual([15000, 100]);
    expect(read?.dismissedTransactionIds).toEqual([dismissed]);
  });

  it('reads nothing for an id that does not exist, and everything with findAll', async () => {
    const first = newBill();
    const second = newBill({ kind: 'general', counterparty: null });
    await repository.save(first);
    await repository.save(second);

    expect(await repository.findById('nope')).toBeNull();
    expect((await repository.findAll()).map((bill) => bill.id).toSorted()).toEqual(
      [first.id, second.id].toSorted(),
    );
  });

  it('saving again updates the bill and replaces the payments and dismissals', async () => {
    const tx = await expense();
    const bill = newBill();
    const payment = bill.addPayment(
      { transactionId: tx, amount: Money.fromCents(1000), paidOn: BusinessDate.of('2026-11-03') },
      Money.zero(),
      NOW,
    );
    await repository.save(bill);

    bill.removePayment(payment.id, LATER);
    bill.edit(
      { description: 'Show', dueOn: null, amount: Money.fromCents(50000) },
      Money.zero(),
      LATER,
    );
    bill.dismissPaymentSuggestion(tx, LATER);
    await repository.save(bill);
    const read = await repository.findById(bill.id);

    expect(read).toMatchObject({
      description: 'Show',
      dueOn: null,
      updatedAt: LATER,
      payments: [],
    });
    expect(read?.amount.cents).toBe(50000);
    expect(read?.createdAt).toBe(NOW);
    expect(read?.dismissedTransactionIds).toEqual([tx]);
    expect(await db.selectFrom('bill_payments').selectAll().execute()).toEqual([]);
  });

  it('deleting the bill takes its payments and dismissals with it', async () => {
    const tx = await expense();
    const bill = newBill();
    bill.addPayment(
      { transactionId: tx, amount: Money.fromCents(1000), paidOn: BusinessDate.of('2026-11-03') },
      Money.zero(),
      NOW,
    );
    bill.dismissPaymentSuggestion(await expense(), NOW);
    await repository.save(bill);

    await repository.delete(bill.id);

    expect(await repository.findById(bill.id)).toBeNull();
    expect(await db.selectFrom('bill_payments').selectAll().execute()).toEqual([]);
    expect(await db.selectFrom('bill_payment_dismissals').selectAll().execute()).toEqual([]);
  });

  it('knows which transactions are the payment or the origin of a bill', async () => {
    const paid = await expense();
    const origin = await expense();
    const free = await expense();
    const paying = newBill();
    paying.addPayment(
      { transactionId: paid, amount: Money.fromCents(1000), paidOn: BusinessDate.of('2026-11-03') },
      Money.zero(),
      NOW,
    );
    await repository.save(paying);
    await repository.save(
      newBill({
        direction: 'receivable',
        originTransactionId: origin,
        amount: Money.fromCents(1000),
      }),
    );

    const linked = await repository.findLinkedTransactionIds([paid, origin, free]);

    expect(linked).toEqual(new Set([paid, origin]));
    expect(await repository.findLinkedTransactionIds([])).toEqual(new Set());
  });

  it('a transaction pays one bill only (unique on the link)', async () => {
    const tx = await expense();
    const pay = (bill: Bill) =>
      bill.addPayment(
        { transactionId: tx, amount: Money.fromCents(1000), paidOn: BusinessDate.of('2026-11-03') },
        Money.zero(),
        NOW,
      );
    const first = newBill();
    const second = newBill();
    pay(first);
    pay(second);
    await repository.save(first);

    await expect(repository.save(second)).rejects.toThrow();
  });

  it('deleting a transaction takes the payment it made and leaves the origin without the link', async () => {
    const paid = await expense();
    const origin = await expense();
    const paying = newBill();
    paying.addPayment(
      { transactionId: paid, amount: Money.fromCents(1000), paidOn: BusinessDate.of('2026-11-03') },
      Money.zero(),
      NOW,
    );
    const originating = newBill({
      direction: 'receivable',
      originTransactionId: origin,
      amount: Money.fromCents(1000),
    });
    await repository.save(paying);
    await repository.save(originating);

    await db.deleteFrom('transactions').where('id', 'in', [paid, origin]).execute();

    expect((await repository.findById(paying.id))?.payments).toEqual([]);
    expect((await repository.findById(originating.id))?.originTransactionId).toBeNull();
  });
});

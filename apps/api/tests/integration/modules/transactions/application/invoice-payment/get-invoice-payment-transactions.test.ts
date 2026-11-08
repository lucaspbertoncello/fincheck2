import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetInvoicePaymentTransactionsQuery } from '#/modules/transactions/application/invoice-payment/get-invoice-payment-transactions.query.ts';
import { TransactionNotFoundError } from '#/modules/transactions/domain/transaction/transaction-not-found.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const REMOVED_AT = '2026-11-05T00:00:00.000Z';

// What `invoices` asks of `transactions` about the transactions that pay (or may pay) an invoice.
describe('GetInvoicePaymentTransactionsQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: GetInvoicePaymentTransactionsQuery;
  let checking: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new GetInvoicePaymentTransactionsQuery(database.db);
    checking = await insertTestAccount(database.db, { name: 'Nubank' });
  });

  afterEach(async () => {
    await database.destroy();
  });

  const bankRow = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, checking, {
      origin: 'bank',
      nature_set_by: 'system',
      description: 'PAGAMENTO FATURA',
      bank_description: 'PAGAMENTO FATURA',
      amount_cents: -50000,
      bank_amount_cents: -50000,
      occurred_on: '2026-11-10',
      bank_occurred_on: '2026-11-10',
      bank_status: 'posted',
      ...overrides,
    });

  const insertSplit = (transactionId: string, position: number, amountCents: number) =>
    database.db
      .insertInto('transaction_splits')
      .values({
        id: generateId(),
        transaction_id: transactionId,
        position,
        amount_cents: amountCents,
        nature: 'expense',
        category_id: null,
        description: null,
      })
      .execute();

  describe('findMany', () => {
    it('answers the id, the account, the amount, the nature, whether it is split and whether it counts', async () => {
      const id = await insertTestTransaction(database.db, checking, {
        nature: 'invoice_payment',
        amount_cents: -73000,
      });

      const found = await query.findMany([id]);

      expect(found.get(id)).toEqual({
        id,
        accountId: checking,
        amountCents: -73000,
        nature: 'invoice_payment',
        isSplit: false,
        counts: true,
      });
    });

    it('answers many at once, keyed by id, and leaves out the ids that do not exist', async () => {
      const card = await insertTestCreditCard(database.db);
      const debit = await insertTestTransaction(database.db, checking, {
        nature: 'invoice_payment',
        amount_cents: -10000,
      });
      const credit = await insertTestTransaction(database.db, card, {
        nature: 'invoice_payment',
        method: 'credit',
        amount_cents: 10000,
      });
      const ghost = generateId();

      const found = await query.findMany([debit, credit, ghost]);

      expect([...found.keys()].sort()).toEqual([debit, credit].sort());
      expect(found.get(debit)).toMatchObject({ accountId: checking, amountCents: -10000 });
      expect(found.get(credit)).toMatchObject({ accountId: card, amountCents: 10000 });
      expect(found.has(ghost)).toBe(false);
    });

    it('accepts repeated ids and an empty list', async () => {
      const id = await insertTestTransaction(database.db, checking);

      expect((await query.findMany([id, id, id])).size).toBe(1);
      expect(await query.findMany([])).toEqual(new Map());
    });

    it('says a split transaction is split, and one with no parts is not', async () => {
      const split = await insertTestTransaction(database.db, checking, { amount_cents: -1000 });
      await insertSplit(split, 1, -400);
      await insertSplit(split, 2, -600);
      const whole = await insertTestTransaction(database.db, checking);

      const found = await query.findMany([split, whole]);

      expect(found.get(split)?.isSplit).toBe(true);
      expect(found.get(whole)?.isSplit).toBe(false);
    });

    it('says it does not count when it is ignored', async () => {
      const ignored = await insertTestTransaction(database.db, checking, {
        ignored_at: '2026-11-04T10:00:00.000Z',
      });

      expect((await query.findMany([ignored])).get(ignored)?.counts).toBe(false);
    });

    it('says it does not count when the bank removed it without an edit, and counts when it was edited', async () => {
      const removed = await bankRow({ bank_removed_at: REMOVED_AT });
      const editedAmount = await bankRow({
        amount_cents: -49000,
        bank_removed_at: REMOVED_AT,
      });
      const editedDescription = await bankRow({
        description: 'Fatura Nubank',
        bank_removed_at: REMOVED_AT,
      });
      const editedDate = await bankRow({
        occurred_on: '2026-11-11',
        bank_removed_at: REMOVED_AT,
      });
      const alive = await bankRow();

      const found = await query.findMany([
        removed,
        editedAmount,
        editedDescription,
        editedDate,
        alive,
      ]);

      expect(found.get(removed)?.counts).toBe(false);
      expect(found.get(editedAmount)?.counts).toBe(true);
      expect(found.get(editedDescription)?.counts).toBe(true);
      expect(found.get(editedDate)?.counts).toBe(true);
      expect(found.get(alive)?.counts).toBe(true);
    });

    it('reports a transaction of any nature as it is, not only the payments', async () => {
      const expense = await insertTestTransaction(database.db, checking);
      const transfer = await insertTestTransaction(database.db, checking, { nature: 'transfer' });

      const found = await query.findMany([expense, transfer]);

      expect(found.get(expense)?.nature).toBe('expense');
      expect(found.get(transfer)?.nature).toBe('transfer');
    });
  });

  describe('requireOne', () => {
    it('answers the snapshot of the transaction', async () => {
      const id = await insertTestTransaction(database.db, checking, {
        nature: 'invoice_payment',
        amount_cents: -2500,
      });

      expect(await query.requireOne(id)).toEqual({
        id,
        accountId: checking,
        amountCents: -2500,
        nature: 'invoice_payment',
        isSplit: false,
        counts: true,
      });
    });

    it('throws TRANSACTION_NOT_FOUND for an id that does not exist', async () => {
      const failure = await query.requireOne(generateId()).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(TransactionNotFoundError);
      expect(failure).toMatchObject({ code: 'TRANSACTION_NOT_FOUND' });
    });
  });
});

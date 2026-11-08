import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetCardInvoiceTransactionsQuery } from '#/modules/transactions/application/card-invoice/get-card-invoice-transactions.query.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const OCT = Month.of('2026-10');
const NOV = Month.of('2026-11');
const DEC = Month.of('2026-12');
const REMOVED_AT = '2026-11-05T00:00:00.000Z';

// What `invoices` asks of `transactions` for the invoice of a card, on a real SQLite file.
describe('GetCardInvoiceTransactionsQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: GetCardInvoiceTransactionsQuery;
  let card: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new GetCardInvoiceTransactionsQuery(database.db);
    card = await insertTestCreditCard(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  // A purchase on the card: credit, negative, on the invoice of `invoice_month`.
  const onCard = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, card, {
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: -1000,
      ...overrides,
    });

  // A line imported from the bank: the version in use starts equal to the bank's.
  const bankLine = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    onCard({
      origin: 'bank',
      nature_set_by: 'system',
      description: 'LOJA X',
      bank_description: 'LOJA X',
      amount_cents: -1000,
      bank_amount_cents: -1000,
      occurred_on: '2026-11-03',
      bank_occurred_on: '2026-11-03',
      bank_status: 'posted',
      ...overrides,
    });

  const insertSplit = (
    transactionId: string,
    position: number,
    overrides: Partial<{
      amount_cents: number;
      nature: 'expense' | 'income' | 'lent' | 'reimbursed';
      category_id: string | null;
      description: string | null;
    }> = {},
  ) =>
    database.db
      .insertInto('transaction_splits')
      .values({
        id: generateId(),
        transaction_id: transactionId,
        position,
        amount_cents: -500,
        nature: 'expense',
        category_id: null,
        description: null,
        ...overrides,
      })
      .execute();

  describe('totalsByMonth', () => {
    it('sums what is charged per invoice month, purchases apart from installments, and counts', async () => {
      const plan = await insertTestInstallmentPlan(database.db, card);
      await onCard({ amount_cents: -1000 });
      await onCard({ amount_cents: -2500 });
      await onCard({ amount_cents: -10000, installment_plan_id: plan, installment_number: 1 });
      await onCard({
        invoice_month: '2026-12',
        amount_cents: -10000,
        installment_plan_id: plan,
        installment_number: 2,
      });
      await onCard({ invoice_month: '2026-12', amount_cents: -4000 });

      const totals = await query.totalsByMonth(card, [OCT, NOV, DEC]);

      expect([...totals.keys()].sort()).toEqual(['2026-11', '2026-12']);
      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 3500,
        installmentsCents: 10000,
        transactionCount: 3,
      });
      expect(totals.get('2026-12')).toEqual({
        purchasesCents: 4000,
        installmentsCents: 10000,
        transactionCount: 2,
      });
    });

    it('does not put a month with no transaction in the map', async () => {
      await onCard();

      const totals = await query.totalsByMonth(card, [OCT, NOV, DEC]);

      expect(totals.has('2026-10')).toBe(false);
      expect(totals.has('2026-12')).toBe(false);
      expect(totals.has('2026-11')).toBe(true);
    });

    it('answers an empty map for no months and for a card with nothing', async () => {
      await onCard();

      expect(await query.totalsByMonth(card, [])).toEqual(new Map());
      expect(await query.totalsByMonth(await insertTestCreditCard(database.db), [NOV])).toEqual(
        new Map(),
      );
    });

    it('only reads the months asked for', async () => {
      await onCard({ invoice_month: '2026-10' });
      await onCard({ invoice_month: '2026-11' });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect([...totals.keys()]).toEqual(['2026-11']);
    });

    it('subtracts a refund (positive amount) from the month', async () => {
      await onCard({ amount_cents: -5000 });
      await onCard({ amount_cents: 1200, description: 'Estorno' });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 3800,
        installmentsCents: 0,
        transactionCount: 2,
      });
    });

    it('subtracts a refund of an installment from the installments', async () => {
      const plan = await insertTestInstallmentPlan(database.db, card);
      await onCard({ amount_cents: -10000, installment_plan_id: plan, installment_number: 1 });
      await onCard({ amount_cents: 2000, installment_plan_id: plan, installment_number: 2 });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 0,
        installmentsCents: 8000,
        transactionCount: 2,
      });
    });

    it('does not count what pays the invoice, but counts transfer, lent, reimbursed and adjustment', async () => {
      await onCard({ amount_cents: -1000 });
      await onCard({ nature: 'invoice_payment', amount_cents: 99999 });
      await onCard({ nature: 'invoice_payment', amount_cents: -88888, nature_set_by: 'system' });
      await onCard({ nature: 'transfer', amount_cents: -200 });
      await onCard({ nature: 'lent', amount_cents: -300 });
      await onCard({ nature: 'reimbursed', amount_cents: 40 });
      await onCard({ nature: 'balance_adjustment', amount_cents: -5 });

      const totals = await query.totalsByMonth(card, [NOV]);

      // -(-1000 - 200 - 300 + 40 - 5) = 1465
      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 1465,
        installmentsCents: 0,
        transactionCount: 5,
      });
    });

    it('leaves out the ignored ones', async () => {
      await onCard({ amount_cents: -1000 });
      await onCard({ amount_cents: -7000, ignored_at: '2026-11-04T10:00:00.000Z' });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 1000,
        installmentsCents: 0,
        transactionCount: 1,
      });
    });

    it('leaves out what the bank removed without an edit, and keeps it when it was edited', async () => {
      await onCard({ amount_cents: -1000 });
      // Removed by the bank, never edited: out.
      await bankLine({
        amount_cents: -3000,
        bank_amount_cents: -3000,
        bank_removed_at: REMOVED_AT,
      });
      // Removed by the bank, but the description was changed: stays.
      await bankLine({
        description: 'Mercado do bairro',
        amount_cents: -400,
        bank_amount_cents: -400,
        bank_removed_at: REMOVED_AT,
      });
      // Removed by the bank, but the amount was changed: stays.
      await bankLine({
        amount_cents: -600,
        bank_amount_cents: -650,
        bank_removed_at: REMOVED_AT,
      });
      // Removed by the bank, but the date was moved: stays.
      await bankLine({
        amount_cents: -50,
        bank_amount_cents: -50,
        occurred_on: '2026-11-04',
        bank_removed_at: REMOVED_AT,
      });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 1000 + 400 + 600 + 50,
        installmentsCents: 0,
        transactionCount: 4,
      });
    });

    it('counts a bank line that was never removed, edited or not', async () => {
      await bankLine({ amount_cents: -900, bank_amount_cents: -1000 });
      await bankLine({ amount_cents: -100, bank_amount_cents: -100 });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')?.purchasesCents).toBe(1000);
      expect(totals.get('2026-11')?.transactionCount).toBe(2);
    });

    it("does not mix in another account's transactions, nor the ones with no invoice month", async () => {
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      const checking = await insertTestAccount(database.db);
      await onCard({ amount_cents: -1000 });
      await insertTestTransaction(database.db, otherCard, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: -9000,
      });
      await insertTestTransaction(database.db, checking, {
        invoice_month: '2026-11',
        amount_cents: -8000,
      });
      await onCard({ invoice_month: null, amount_cents: -7000 });

      const totals = await query.totalsByMonth(card, [NOV]);

      expect(totals.get('2026-11')).toEqual({
        purchasesCents: 1000,
        installmentsCents: 0,
        transactionCount: 1,
      });
    });
  });

  describe('itemsOf', () => {
    it('answers the lines of the month with the fields the invoice shows', async () => {
      const food = await insertTestCategory(database.db);
      const id = await onCard({
        description: 'Padaria',
        occurred_on: '2026-10-28',
        amount_cents: -1250,
        category_id: food,
        category_source: 'user',
      });

      const items = await query.itemsOf(card, NOV);

      expect(items).toEqual([
        {
          transactionId: id,
          description: 'Padaria',
          occurredOn: '2026-10-28',
          amountCents: -1250,
          nature: 'expense',
          categoryId: food,
          installment: null,
          parts: [],
        },
      ]);
    });

    it('gives the installment as number and count, the count coming from the plan', async () => {
      const plan = await insertTestInstallmentPlan(database.db, card, { installment_count: 10 });
      const id = await onCard({
        description: 'Cadeira ergonômica',
        amount_cents: -3000,
        installment_plan_id: plan,
        installment_number: 4,
      });
      const plain = await onCard({ description: 'Café' });

      const items = await query.itemsOf(card, NOV);

      expect(items.find((item) => item.transactionId === id)?.installment).toEqual({
        number: 4,
        count: 10,
      });
      expect(items.find((item) => item.transactionId === plain)?.installment).toBeNull();
    });

    it('gives the parts of a split transaction in position order', async () => {
      const food = await insertTestCategory(database.db);
      const home = await insertTestCategory(database.db, { icon: 'home' });
      const id = await onCard({ amount_cents: -1500, description: 'Mercado' });
      const plain = await onCard({ description: 'Sem divisão' });
      // Inserted out of order on purpose.
      await insertSplit(id, 2, { amount_cents: -500, nature: 'lent', description: 'Fulano' });
      await insertSplit(id, 1, { amount_cents: -700, category_id: food, nature: 'expense' });
      await insertSplit(id, 3, { amount_cents: -300, category_id: home, nature: 'expense' });

      const items = await query.itemsOf(card, NOV);

      expect(items.find((item) => item.transactionId === id)?.parts).toEqual([
        { categoryId: food, amountCents: -700, nature: 'expense' },
        { categoryId: null, amountCents: -500, nature: 'lent' },
        { categoryId: home, amountCents: -300, nature: 'expense' },
      ]);
      expect(items.find((item) => item.transactionId === plain)?.parts).toEqual([]);
    });

    it('keeps each part with its own transaction', async () => {
      const first = await onCard({ description: 'A', amount_cents: -1000 });
      const second = await onCard({ description: 'B', amount_cents: -600 });
      await insertSplit(first, 1, { amount_cents: -400 });
      await insertSplit(first, 2, { amount_cents: -600 });
      await insertSplit(second, 1, { amount_cents: -600 });

      const items = await query.itemsOf(card, NOV);

      expect(items.find((item) => item.transactionId === first)?.parts).toHaveLength(2);
      expect(items.find((item) => item.transactionId === second)?.parts).toEqual([
        { categoryId: null, amountCents: -600, nature: 'expense' },
      ]);
    });

    it('only reads the month and the card asked for', async () => {
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      const mine = await onCard({ description: 'Meu' });
      await onCard({ description: 'Outro mês', invoice_month: '2026-12' });
      await onCard({ description: 'Sem fatura', invoice_month: null });
      await insertTestTransaction(database.db, otherCard, {
        method: 'credit',
        invoice_month: '2026-11',
        description: 'Do outro cartão',
      });

      const items = await query.itemsOf(card, NOV);

      expect(items.map((item) => item.transactionId)).toEqual([mine]);
    });

    it('leaves out the payment of an invoice, the ignored and what the bank removed without an edit', async () => {
      const kept = await onCard({ description: 'Fica' });
      await onCard({ nature: 'invoice_payment', amount_cents: 5000 });
      await onCard({ ignored_at: '2026-11-04T10:00:00.000Z' });
      await bankLine({ bank_removed_at: REMOVED_AT });
      const edited = await bankLine({ description: 'Editada', bank_removed_at: REMOVED_AT });

      const items = await query.itemsOf(card, NOV);

      expect(items.map((item) => item.transactionId).sort()).toEqual([kept, edited].sort());
    });

    it('keeps the transfer, the debt and the adjustment of the card, and the refund as a positive line', async () => {
      const transfer = await onCard({ nature: 'transfer', amount_cents: -200 });
      const lent = await onCard({ nature: 'lent', amount_cents: -300 });
      const adjustment = await onCard({ nature: 'balance_adjustment', amount_cents: -5 });
      const refund = await onCard({ amount_cents: 1200 });

      const items = await query.itemsOf(card, NOV);

      expect(
        items.map((item) => [item.transactionId, item.nature, item.amountCents].join('|')).sort(),
      ).toEqual(
        [
          `${transfer}|transfer|-200`,
          `${lent}|lent|-300`,
          `${adjustment}|balance_adjustment|-5`,
          `${refund}|expense|1200`,
        ].sort(),
      );
    });

    it('answers an empty list for a month with nothing', async () => {
      await onCard();

      expect(await query.itemsOf(card, DEC)).toEqual([]);
    });
  });

  describe('invoiceMonthsOf', () => {
    it('answers the distinct invoice months of the card, in order', async () => {
      await onCard({ invoice_month: '2026-12' });
      await onCard({ invoice_month: '2026-10' });
      await onCard({ invoice_month: '2026-12' });
      await onCard({ invoice_month: '2027-01' });
      await onCard({ invoice_month: '2026-11' });
      await onCard({ invoice_month: '2026-11' });

      const months = await query.invoiceMonthsOf(card);

      expect(months.map((month) => month.value)).toEqual([
        '2026-10',
        '2026-11',
        '2026-12',
        '2027-01',
      ]);
    });

    it('includes the months of every transaction, the ignored, removed and payments too', async () => {
      await onCard({ invoice_month: '2026-09', ignored_at: '2026-11-04T10:00:00.000Z' });
      await bankLine({ invoice_month: '2026-10', bank_removed_at: REMOVED_AT });
      await onCard({ invoice_month: '2026-11', nature: 'invoice_payment', amount_cents: 100 });

      const months = await query.invoiceMonthsOf(card);

      expect(months.map((month) => month.value)).toEqual(['2026-09', '2026-10', '2026-11']);
    });

    it('does not count the transactions with no invoice month nor the ones of other accounts', async () => {
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      await onCard({ invoice_month: null });
      await insertTestTransaction(database.db, otherCard, {
        method: 'credit',
        invoice_month: '2027-05',
      });
      await onCard({ invoice_month: '2026-11' });

      const months = await query.invoiceMonthsOf(card);

      expect(months.map((month) => month.value)).toEqual(['2026-11']);
    });

    it('answers an empty list for a card with nothing', async () => {
      expect(await query.invoiceMonthsOf(card)).toEqual([]);
    });
  });
});

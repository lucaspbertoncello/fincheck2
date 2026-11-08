import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  invoiceDtoSchema,
  openInvoiceItemSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The card of the world closes on the 5th and is due on the 12th; "today" is 06/11/2026, so the
// invoice of 2026-11 already closed (due 12/11) and the open one is 2026-12 (closes 05/12).
describe('invoice routes: reads and the correction of the total', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const expectError = (response: Response, status: number, code: string) =>
    world.expectError(response, status, code);

  const purchase = (month: string, cents: number, overrides = {}) =>
    insertTestTransaction(world.database.db, world.card, {
      method: 'credit',
      invoice_month: month,
      amount_cents: -cents,
      occurred_on: `${month}-02`,
      ...overrides,
    });

  describe('GET /invoices/open', () => {
    it('answers an empty list when there is no active card', async () => {
      await world.database.db
        .updateTable('accounts')
        .set({ archived_at: '2026-11-01T00:00:00.000Z' })
        .where('id', '=', world.card)
        .execute();

      const response = await world.send('GET', '/invoices/open');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [] });
    });

    it('brings the open invoice when nothing is waiting to be paid', async () => {
      const response = await world.send('GET', '/invoices/open');

      expect(response.status).toBe(200);
      const { items } = listResponseSchema(openInvoiceItemSchema).parse(await response.json());
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        accountId: world.card,
        invoice: { month: '2026-12', status: 'open', closesOn: '2026-12-05', dueOn: '2026-12-14' },
      });
    });

    it('brings the oldest invoice still to pay, and the next one after it is paid (BR-DSH-009)', async () => {
      await purchase('2026-10', 3000);
      await purchase('2026-11', 5000);

      const first = listResponseSchema(openInvoiceItemSchema).parse(
        await (await world.send('GET', '/invoices/open')).json(),
      );
      expect(first.items[0]?.invoice).toMatchObject({ month: '2026-10', status: 'overdue' });

      await world.invoiceOf(
        await world.send('POST', `/cards/${world.card}/invoices/2026-10/payments`, {
          amountCents: 3000,
          paidOn: '2026-10-12',
        }),
        201,
      );
      const second = listResponseSchema(openInvoiceItemSchema).parse(
        await (await world.send('GET', '/invoices/open')).json(),
      );
      expect(second.items[0]?.invoice).toMatchObject({ month: '2026-11', status: 'closed' });
    });

    it('looks only at the three months before the open one: an older unpaid invoice is not shown', async () => {
      // The open invoice is 2026-12: the months looked at are 2026-09, 2026-10 and 2026-11.
      await purchase('2026-08', 2000);
      const first = listResponseSchema(openInvoiceItemSchema).parse(
        await (await world.send('GET', '/invoices/open')).json(),
      );
      expect(first.items[0]?.invoice).toMatchObject({ month: '2026-12', status: 'open' });

      await purchase('2026-09', 3000);
      const second = listResponseSchema(openInvoiceItemSchema).parse(
        await (await world.send('GET', '/invoices/open')).json(),
      );
      // The oldest of the three months that is still to pay.
      expect(second.items[0]?.invoice).toMatchObject({ month: '2026-09', status: 'overdue' });
    });

    it('does not bring an archived card, and orders the cards by due date, then by card', async () => {
      const second = await insertTestCreditCard(world.database.db, { name: 'Outro cartão' });
      await world.database.db
        .updateTable('credit_cards')
        .set({ closing_day: 20, due_day: 28 })
        .where('account_id', '=', second)
        .execute();
      const archived = await insertTestCreditCard(world.database.db, { name: 'Antigo' });
      await world.database.db
        .updateTable('accounts')
        .set({ archived_at: '2026-11-01T00:00:00.000Z' })
        .where('id', '=', archived)
        .execute();

      const { items } = listResponseSchema(openInvoiceItemSchema).parse(
        await (await world.send('GET', '/invoices/open')).json(),
      );

      // The second card closes on the 20th: its open invoice is November (due 30/11, the 28th being a Saturday), before the
      // 14/12 of the first.
      expect(items.map((item) => [item.accountId, item.invoice.month, item.invoice.dueOn])).toEqual(
        [
          [second, '2026-11', '2026-11-30'],
          [world.card, '2026-12', '2026-12-14'],
        ],
      );
    });

    it('answers 401 on every invoice route without the local token', async () => {
      const id = generateId();
      for (const [method, path] of [
        ['GET', '/invoices/open'],
        ['GET', `/cards/${world.card}/invoices`],
        ['GET', `/cards/${world.card}/invoices/2026-11`],
        ['PATCH', `/cards/${world.card}/invoices/2026-11`],
        ['POST', `/cards/${world.card}/invoices/2026-11/payments`],
        ['DELETE', `/cards/${world.card}/invoices/2026-11/payments/${id}`],
        ['POST', `/cards/${world.card}/invoices/2026-11/payment-suggestion/dismiss`],
        [
          'DELETE',
          `/cards/${world.card}/invoices/2026-11/payment-suggestion/dismiss?transactionId=${id}`,
        ],
      ] as const) {
        const response = await world.app.request(path, {
          method,
          headers: { 'x-fincheck-token': 'wrong' },
        });
        await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
      }
    });
  });

  describe('GET /cards/:accountId/invoices', () => {
    it('brings every month from two before the open invoice to three after it, oldest first', async () => {
      const response = await world.send('GET', `/cards/${world.card}/invoices`);

      expect(response.status).toBe(200);
      const { items } = listResponseSchema(invoiceDtoSchema).parse(await response.json());
      expect(items.map((item) => [item.month, item.status])).toEqual([
        ['2026-10', 'paid'],
        ['2026-11', 'paid'],
        ['2026-12', 'open'],
        ['2027-01', 'projected'],
        ['2027-02', 'projected'],
        ['2027-03', 'projected'],
      ]);
      expect(items.every((item) => item.isEditable === (item.status !== 'projected'))).toBe(true);
    });

    it('takes from and to, every month even with no row and no purchase', async () => {
      const response = await world.send(
        'GET',
        `/cards/${world.card}/invoices?from=2026-11&to=2027-01`,
      );

      const { items } = listResponseSchema(invoiceDtoSchema).parse(await response.json());
      expect(items.map((item) => item.month)).toEqual(['2026-11', '2026-12', '2027-01']);
    });

    it('shows the parcels already created in the projected months (RF-INV-003)', async () => {
      const plan = await insertTestInstallmentPlan(world.database.db, world.card, {
        installment_count: 3,
        first_invoice_month: '2026-12',
      });
      for (const [number, month] of [
        [1, '2026-12'],
        [2, '2027-01'],
        [3, '2027-02'],
      ] as const) {
        await purchase(month, 10000, { installment_plan_id: plan, installment_number: number });
      }

      const { items } = listResponseSchema(invoiceDtoSchema).parse(
        await (
          await world.send('GET', `/cards/${world.card}/invoices?from=2026-12&to=2027-03`)
        ).json(),
      );

      expect(
        items.map((item) => [item.month, item.breakdown.installmentsCents, item.totalCents]),
      ).toEqual([
        ['2026-12', 10000, 10000],
        ['2027-01', 10000, 10000],
        ['2027-02', 10000, 10000],
        ['2027-03', 0, 0],
      ]);
      expect(items[1]?.status).toBe('projected');
    });

    it('refuses from after to, more than 24 months, and a malformed month, with 400', async () => {
      for (const query of ['from=2027-01&to=2026-12', 'from=2024-01&to=2026-12', 'from=2026-13']) {
        await expectError(
          await world.send('GET', `/cards/${world.card}/invoices?${query}`),
          400,
          'VALIDATION_FAILED',
        );
      }
    });

    it('answers 404 CARD_NOT_FOUND for an account that is not a card and for one that does not exist', async () => {
      for (const id of [world.checking, generateId()]) {
        await expectError(await world.send('GET', `/cards/${id}/invoices`), 404, 'CARD_NOT_FOUND');
      }
      await expectError(
        await world.send('GET', '/cards/not-an-id/invoices'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('GET /cards/:accountId/invoices/:month', () => {
    it('brings the lines, the composition by category, the month before and the highlights', async () => {
      const food = await insertTestCategory(world.database.db, { name: 'Comida teste' });
      const fun = await insertTestCategory(world.database.db, { name: 'Diversão teste' });
      const db = world.database.db;
      await purchase('2026-10', 3000);
      const a = await purchase('2026-11', 4000, {
        category_id: food,
        category_source: 'user',
        occurred_on: '2026-11-02',
      });
      await purchase('2026-11', 1000, {
        category_id: fun,
        category_source: 'user',
        occurred_on: '2026-11-04',
      });
      await purchase('2026-11', 500, { occurred_on: '2026-11-04' });
      await insertTestTransaction(db, world.card, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 200,
        category_id: food,
        category_source: 'user',
        occurred_on: '2026-11-05',
        description: 'Estorno',
      });
      const plan = await insertTestInstallmentPlan(db, world.card, { installment_count: 3 });
      const ending = await purchase('2026-11', 3000, {
        installment_plan_id: plan,
        installment_number: 3,
        occurred_on: '2026-11-01',
      });
      await purchase('2026-12', 2000, { installment_plan_id: plan, installment_number: 2 });
      const split = await purchase('2026-11', 2000, { occurred_on: '2026-11-03' });
      await db
        .insertInto('transaction_splits')
        .values([
          {
            id: generateId(),
            transaction_id: split,
            position: 1,
            amount_cents: -1200,
            nature: 'expense',
            category_id: fun,
            description: null,
          },
          {
            id: generateId(),
            transaction_id: split,
            position: 2,
            amount_cents: -800,
            nature: 'lent',
            category_id: null,
            description: null,
          },
        ])
        .execute();
      // The payment of an invoice and an ignored purchase are not on it.
      await insertTestTransaction(db, world.card, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 99999,
        nature: 'invoice_payment',
      });
      await purchase('2026-11', 7777, { ignored_at: '2026-11-03T00:00:00.000Z' });

      const detail = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2026-11`),
      );

      expect(detail).toMatchObject({
        month: '2026-11',
        status: 'closed',
        closesOn: '2026-11-05',
        dueOn: '2026-11-12',
        breakdown: { purchasesCents: 7300, installmentsCents: 3000, expectedRecurringCents: 0 },
        computedTotalCents: 10300,
        totalCents: 10300,
        remainingCents: 10300,
        previousTotalCents: 3000,
        // The month after already has the second parcel of the plan.
        nextInvoiceCommittedCents: 2000,
      });
      expect(detail.categoryBreakdown).toEqual([
        { categoryId: food, isLent: false, totalCents: 3800, sharePercent: 36.9, itemCount: 2 },
        { categoryId: null, isLent: false, totalCents: 3500, sharePercent: 34, itemCount: 2 },
        { categoryId: fun, isLent: false, totalCents: 2200, sharePercent: 21.4, itemCount: 2 },
        // What was lent has its own line, apart from the purchases with no category.
        { categoryId: null, isLent: true, totalCents: 800, sharePercent: 7.8, itemCount: 1 },
      ]);
      expect(detail.highlights).toEqual({
        largestItem: { transactionId: a, title: 'Padaria', cents: 4000 },
        endingInstallments: [
          { transactionId: ending, title: 'Padaria', cents: 3000, number: 3, total: 3 },
        ],
      });
      const dates = detail.items.map((item) =>
        item.type === 'transaction' ? item.occurredOn : '',
      );
      expect(dates).toEqual([...dates].sort().reverse());
      expect(detail.items).toHaveLength(6);
      const splitItem = detail.items.find(
        (item) => item.type === 'transaction' && item.transactionId === split,
      );
      expect(splitItem).toMatchObject({ categoryId: null, amountCents: -2000, installment: null });
      const parcel = detail.items.find(
        (item) => item.type === 'transaction' && item.transactionId === ending,
      );
      expect(parcel).toMatchObject({ installment: { number: 3, count: 3 } });
    });

    it('answers a null previous total when the month before has no invoice and no purchase', async () => {
      await purchase('2026-11', 1000);

      const october = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
      );
      const november = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2026-11`),
      );

      expect(october.previousTotalCents).toBeNull();
      expect(november.previousTotalCents).toBeNull();
    });

    it('answers the empty detail of a month with nothing, and the projected one with isEditable false', async () => {
      const empty = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2026-12`),
      );
      const projected = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2027-05`),
      );

      expect(empty).toMatchObject({
        status: 'open',
        items: [],
        categoryBreakdown: [],
        highlights: { largestItem: null, endingInstallments: [] },
        nextInvoiceCommittedCents: 0,
      });
      expect(projected).toMatchObject({ status: 'projected', isEditable: false });
    });

    it('answers a credit as a negative total, without a floor (refunds bigger than the purchases)', async () => {
      await insertTestTransaction(world.database.db, world.card, {
        method: 'credit',
        invoice_month: '2026-12',
        amount_cents: 4000,
        description: 'Estorno de compra',
      });
      await purchase('2026-12', 1000);

      const detail = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/2026-12`),
      );

      expect(detail).toMatchObject({
        computedTotalCents: -3000,
        totalCents: -3000,
        remainingCents: 0,
      });
      // Refunds bigger than the spending leave no category line (the contract has no negative share).
      expect(detail.categoryBreakdown).toEqual([]);
    });

    it('answers 404, 400 and 401', async () => {
      await expectError(
        await world.send('GET', `/cards/${world.checking}/invoices/2026-11`),
        404,
        'CARD_NOT_FOUND',
      );
      await expectError(
        await world.send('GET', `/cards/${world.card}/invoices/2026-13`),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('PATCH /cards/:accountId/invoices/:month', () => {
    const patch = (month: string, body: unknown) =>
      world.send('PATCH', `/cards/${world.card}/invoices/${month}`, body);

    it('corrects the total: the correction wins over the calculated one, and the row is born with the cycle dates', async () => {
      await purchase('2026-11', 5000);

      const dto = await world.invoiceOf(
        await patch('2026-11', { totalOverrideCents: 12345, overrideNote: 'O banco cobrou juros' }),
      );

      expect(dto).toMatchObject({
        month: '2026-11',
        computedTotalCents: 5000,
        totalOverrideCents: 12345,
        overrideNote: 'O banco cobrou juros',
        totalCents: 12345,
        remainingCents: 12345,
      });
      const row = await world.database.db
        .selectFrom('invoices')
        .selectAll()
        .where('account_id', '=', world.card)
        .executeTakeFirstOrThrow();
      expect(row).toMatchObject({
        month: '2026-11',
        closes_on: '2026-11-05',
        due_on: '2026-11-12',
        total_override_cents: 12345,
      });
    });

    it('clears the correction and its note with null, and accepts zero', async () => {
      await purchase('2026-11', 5000);
      await patch('2026-11', { totalOverrideCents: 100, overrideNote: 'x' });

      const zero = await world.invoiceOf(await patch('2026-11', { totalOverrideCents: 0 }));
      expect(zero).toMatchObject({
        totalOverrideCents: 0,
        totalCents: 0,
        remainingCents: 0,
        status: 'paid',
      });
      expect(zero.overrideNote).toBe('x');

      const cleared = await world.invoiceOf(await patch('2026-11', { totalOverrideCents: null }));
      expect(cleared).toMatchObject({
        totalOverrideCents: null,
        overrideNote: null,
        totalCents: 5000,
        status: 'closed',
      });
    });

    it('a note alone only replaces the note of a correction that exists', async () => {
      const without = await world.invoiceOf(
        await patch('2026-11', { overrideNote: 'sem correção' }),
      );
      expect(without).toMatchObject({ totalOverrideCents: null, overrideNote: null });

      await patch('2026-11', { totalOverrideCents: 700, overrideNote: 'antes' });
      const changed = await world.invoiceOf(await patch('2026-11', { overrideNote: 'depois' }));
      expect(changed).toMatchObject({ totalOverrideCents: 700, overrideNote: 'depois' });
    });

    it('keeps the dates of an invoice that has a row when the card changes its days', async () => {
      await patch('2026-11', { totalOverrideCents: 100 });
      await world.database.db
        .updateTable('credit_cards')
        .set({ closing_day: 20, due_day: 28 })
        .where('account_id', '=', world.card)
        .execute();

      const { items } = listResponseSchema(invoiceDtoSchema).parse(
        await (
          await world.send('GET', `/cards/${world.card}/invoices?from=2026-10&to=2026-11`)
        ).json(),
      );
      expect(items.map((item) => [item.month, item.closesOn, item.dueOn])).toEqual([
        // No row: follows the card as it is today.
        ['2026-10', '2026-10-20', '2026-10-28'],
        // Has a row: keeps the dates it was born with.
        ['2026-11', '2026-11-05', '2026-11-12'],
      ]);
    });

    it('still takes the correction and a payment on an archived card (decided by the PM)', async () => {
      await world.database.db
        .updateTable('accounts')
        .set({ archived_at: '2026-11-01T00:00:00.000Z' })
        .where('id', '=', world.card)
        .execute();

      expect(
        (await world.invoiceOf(await patch('2026-11', { totalOverrideCents: 700 }))).totalCents,
      ).toBe(700);
      const paid = await world.invoiceOf(
        await world.send('POST', `/cards/${world.card}/invoices/2026-11/payments`, {
          amountCents: 700,
          paidOn: '2026-11-08',
        }),
        201,
      );
      expect(paid.status).toBe('paid');
    });

    it('refuses a projected invoice with 422 INVOICE_NOT_EDITABLE and writes nothing', async () => {
      await expectError(
        await patch('2027-01', { totalOverrideCents: 100 }),
        422,
        'INVOICE_NOT_EDITABLE',
      );
      expect(await world.database.db.selectFrom('invoices').select('id').execute()).toEqual([]);
    });

    it('answers 400 for an empty body, a negative total and a long note, and 404 for a card that is not', async () => {
      for (const body of [
        {},
        { totalOverrideCents: -1 },
        { overrideNote: 'x'.repeat(201) },
        { totalOverrideCents: 1.5 },
      ]) {
        await expectError(await patch('2026-11', body), 400, 'VALIDATION_FAILED');
      }
      await expectError(
        await world.send('PATCH', `/cards/${world.checking}/invoices/2026-11`, {
          totalOverrideCents: 1,
        }),
        404,
        'CARD_NOT_FOUND',
      );
    });
  });
});

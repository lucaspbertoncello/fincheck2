import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The card closes on the 5th and is due on the 12th; "today" is 06/11/2026, so the invoice of
// 2026-11 is closed (R$ 50,00 here) and the open one is 2026-12.
describe('invoice payment routes', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
    await insertTestTransaction(world.database.db, world.card, {
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: -5000,
      occurred_on: '2026-11-02',
    });
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const expectError = (response: Response, status: number, code: string) =>
    world.expectError(response, status, code);
  const base = (month = '2026-11') => `/cards/${world.card}/invoices/${month}`;
  const pay = (body: unknown, month = '2026-11') =>
    world.send('POST', `${base(month)}/payments`, body);
  const get = async (month = '2026-11') => world.invoiceOf(await world.send('GET', base(month)));

  // A debit of the checking account.
  const debit = (overrides = {}) =>
    insertTestTransaction(world.database.db, world.checking, {
      method: 'pix',
      amount_cents: -5000,
      occurred_on: '2026-11-10',
      description: 'PAGAMENTO FATURA',
      ...overrides,
    });
  // What the import detector would have marked: the debit as a payment, set by the system.
  const marked = (overrides = {}) =>
    debit({ nature: 'invoice_payment', nature_set_by: 'system', ...overrides });
  const nature = async (id: string) =>
    world.database.db
      .selectFrom('transactions')
      .select(['nature', 'nature_set_by', 'category_id'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
  const paymentRows = () => world.database.db.selectFrom('invoice_payments').selectAll().execute();

  describe('POST /cards/:accountId/invoices/:month/payments', () => {
    it('registers a partial payment by hand, and the invoice becomes partial', async () => {
      const dto = await world.invoiceOf(
        await pay({ amountCents: 2000, paidOn: '2026-11-08' }),
        201,
      );

      expect(dto).toMatchObject({
        status: 'partial',
        totalCents: 5000,
        paidCents: 2000,
        presumedPaidCents: 0,
        remainingCents: 3000,
      });
      expect(dto.payments).toEqual([
        { id: dto.payments[0]?.id, amountCents: 2000, paidOn: '2026-11-08', transactionId: null },
      ]);
      const row = await world.database.db
        .selectFrom('invoices')
        .select(['month', 'closes_on', 'due_on'])
        .executeTakeFirstOrThrow();
      expect(row).toEqual({ month: '2026-11', closes_on: '2026-11-05', due_on: '2026-11-12' });
    });

    it('is overdue after the due date even with part paid, and paid when the total is covered', async () => {
      await pay({ amountCents: 2000, paidOn: '2026-11-08' });

      const later = world.at('2026-11-20T15:00:00.000Z');
      expect((await world.invoiceOf(await later('GET', base()))).status).toBe('overdue');

      const paid = await world.invoiceOf(
        await pay({ amountCents: 3000, paidOn: '2026-11-09' }),
        201,
      );
      expect(paid).toMatchObject({ status: 'paid', paidCents: 5000, remainingCents: 0 });
      expect(paid.payments.map((payment) => payment.amountCents)).toEqual([2000, 3000]);
    });

    it('accepts a payment above what is left: the invoice is paid, with no error (I4)', async () => {
      const dto = await world.invoiceOf(
        await pay({ amountCents: 9000, paidOn: '2026-11-08' }),
        201,
      );

      expect(dto).toMatchObject({ status: 'paid', paidCents: 9000, remainingCents: 0 });
    });

    it('orders the payments by date, then by creation', async () => {
      await pay({ amountCents: 1000, paidOn: '2026-11-09' });
      await pay({ amountCents: 1000, paidOn: '2026-11-08' });
      const dto = await world.invoiceOf(
        await pay({ amountCents: 1000, paidOn: '2026-11-08' }),
        201,
      );

      expect(dto.payments.map((payment) => payment.paidOn)).toEqual([
        '2026-11-08',
        '2026-11-08',
        '2026-11-09',
      ]);
    });

    it('refuses a projected invoice with 422 INVOICE_NOT_PAYABLE and writes nothing', async () => {
      await expectError(
        await pay({ amountCents: 1000, paidOn: '2026-11-08' }, '2027-02'),
        422,
        'INVOICE_NOT_PAYABLE',
      );
      expect(await paymentRows()).toEqual([]);
      expect(await world.database.db.selectFrom('invoices').select('id').execute()).toEqual([]);
    });

    it('answers 404 for a card that is not, and 400 for a body that is not right', async () => {
      await expectError(
        await world.send('POST', `/cards/${world.checking}/invoices/2026-11/payments`, {
          amountCents: 1000,
          paidOn: '2026-11-08',
        }),
        404,
        'CARD_NOT_FOUND',
      );
      for (const body of [
        {},
        { amountCents: 0, paidOn: '2026-11-08' },
        { amountCents: -5, paidOn: '2026-11-08' },
        { amountCents: 10.5, paidOn: '2026-11-08' },
        { amountCents: 100, paidOn: '2026-02-30' },
        { amountCents: 100, paidOn: '2026-11-08', transactionId: 'abc' },
      ]) {
        await expectError(await pay(body), 400, 'VALIDATION_FAILED');
      }
    });

    describe('tied to a transaction', () => {
      it('turns the debit into the payment: nature set by Lucas, no category, and the link shows on it', async () => {
        const category = await insertTestCategory(world.database.db, { name: 'Pagamentos teste' });
        const id = await debit({ category_id: category, category_source: 'user' });

        const dto = await world.invoiceOf(
          await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id }),
          201,
        );

        expect(dto).toMatchObject({ status: 'paid', paidCents: 5000, remainingCents: 0 });
        expect(dto.payments[0]).toMatchObject({ transactionId: id, amountCents: 5000 });
        expect(await nature(id)).toEqual({
          nature: 'invoice_payment',
          nature_set_by: 'user',
          category_id: null,
        });
        const transaction = await world.transactionOf(
          await world.send('GET', `/transactions/${id}`),
        );
        expect(transaction).toMatchObject({
          nature: 'invoice_payment',
          natureSetBy: 'user',
          categoryId: null,
          links: {
            occurrence: null,
            bill: null,
            invoicePayment: { accountId: world.card, month: '2026-11' },
          },
        });
      });

      it('keeps a debit the detector already marked as it is: linking only confirms it', async () => {
        const id = await marked();

        await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id });

        expect(await nature(id)).toMatchObject({
          nature: 'invoice_payment',
          nature_set_by: 'system',
        });
      });

      it('takes a credit of the card, which then leaves the invoice (the payment is not a purchase)', async () => {
        const credit = await insertTestTransaction(world.database.db, world.card, {
          method: 'credit',
          invoice_month: '2026-11',
          amount_cents: 3000,
          occurred_on: '2026-11-04',
          description: 'Pagamento recebido',
        });
        expect((await get()).totalCents).toBe(2000);

        const dto = await world.invoiceOf(
          await pay({ amountCents: 3000, paidOn: '2026-11-04', transactionId: credit }),
          201,
        );

        expect(dto).toMatchObject({
          totalCents: 5000,
          paidCents: 3000,
          remainingCents: 2000,
          status: 'partial',
        });
        expect((await nature(credit)).nature).toBe('invoice_payment');
      });

      it('refuses what cannot pay with 422 INVOICE_PAYMENT_TRANSACTION_INVALID, and changes nothing', async () => {
        const credit = await debit({ amount_cents: 5000 });
        const ignored = await debit({ ignored_at: '2026-11-11T00:00:00.000Z' });
        const purchaseOnTheCard = await insertTestTransaction(world.database.db, world.card, {
          method: 'credit',
          invoice_month: '2026-11',
          amount_cents: -5000,
        });
        const transfer = await debit({ nature: 'transfer' });
        const lent = await debit({ nature: 'lent' });
        const split = await debit();
        await world.database.db
          .insertInto('transaction_splits')
          .values([
            {
              id: generateId(),
              transaction_id: split,
              position: 1,
              amount_cents: -2000,
              nature: 'expense',
              category_id: null,
              description: null,
            },
            {
              id: generateId(),
              transaction_id: split,
              position: 2,
              amount_cents: -3000,
              nature: 'expense',
              category_id: null,
              description: null,
            },
          ])
          .execute();
        const small = await debit({ amount_cents: -1000 });

        for (const [id, amountCents] of [
          [credit, 1000],
          [ignored, 1000],
          [purchaseOnTheCard, 1000],
          [transfer, 1000],
          [lent, 1000],
          [split, 1000],
          // The amount is more than the transaction.
          [small, 1001],
        ] as const) {
          await expectError(
            await pay({ amountCents, paidOn: '2026-11-10', transactionId: id }),
            422,
            'INVOICE_PAYMENT_TRANSACTION_INVALID',
          );
        }
        expect(await paymentRows()).toEqual([]);
        expect((await nature(small)).nature).toBe('expense');
        expect((await nature(transfer)).nature).toBe('transfer');
      });

      it('answers 404 TRANSACTION_NOT_FOUND for a transaction that does not exist', async () => {
        await expectError(
          await pay({ amountCents: 100, paidOn: '2026-11-10', transactionId: generateId() }),
          404,
          'TRANSACTION_NOT_FOUND',
        );
      });

      it('answers 409 when the transaction already pays an invoice, and keeps the first payment', async () => {
        const id = await debit();
        await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id });

        await expectError(
          await pay({ amountCents: 1000, paidOn: '2026-11-10', transactionId: id }, '2026-10'),
          409,
          'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
        );
        await expectError(
          await pay({ amountCents: 1000, paidOn: '2026-11-10', transactionId: id }),
          409,
          'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
        );
        expect(await paymentRows()).toHaveLength(1);
      });

      it('counts what the transaction is worth today: ignoring it takes the payment off, correcting it to less lowers it', async () => {
        const id = await debit();
        await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id });
        expect((await get()).paidCents).toBe(5000);

        await world.database.db
          .updateTable('transactions')
          .set({ amount_cents: -3000 })
          .where('id', '=', id)
          .execute();
        expect(await get()).toMatchObject({
          paidCents: 3000,
          remainingCents: 2000,
          status: 'partial',
        });

        await world.send('POST', `/transactions/${id}/ignore`);
        expect(await get()).toMatchObject({ paidCents: 0, remainingCents: 5000, status: 'closed' });

        await world.send('POST', `/transactions/${id}/unignore`);
        expect((await get()).paidCents).toBe(3000);
      });
    });
  });

  describe('DELETE /cards/:accountId/invoices/:month/payments/:paymentId', () => {
    const remove = (paymentId: string, month = '2026-11') =>
      world.send('DELETE', `${base(month)}/payments/${paymentId}`);

    it('undoes a payment made by hand: 204, the invoice is closed again and the row stays', async () => {
      const dto = await world.invoiceOf(
        await pay({ amountCents: 5000, paidOn: '2026-11-08' }),
        201,
      );

      const response = await remove(dto.payments[0]!.id);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(await get()).toMatchObject({ status: 'closed', paidCents: 0, payments: [] });
      expect(await world.database.db.selectFrom('invoices').select('id').execute()).toHaveLength(1);
    });

    it('gives back the nature of a transaction Lucas turned into a payment, by its sign', async () => {
      const id = await debit();
      const dto = await world.invoiceOf(
        await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id }),
        201,
      );

      expect((await remove(dto.payments[0]!.id)).status).toBe(204);

      expect(await nature(id)).toMatchObject({ nature: 'expense', nature_set_by: 'system' });
      const transaction = await world.transactionOf(await world.send('GET', `/transactions/${id}`));
      expect(transaction.links.invoicePayment).toBeNull();
    });

    it('leaves a transaction the detector marked as a payment, and it is a suggestion again', async () => {
      const id = await marked();
      const dto = await world.invoiceOf(
        await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id }),
        201,
      );
      expect(dto.paymentSuggestion).toBeNull();

      await remove(dto.payments[0]!.id);

      expect(await nature(id)).toMatchObject({
        nature: 'invoice_payment',
        nature_set_by: 'system',
      });
      expect((await get()).paymentSuggestion).toMatchObject({
        transactionId: id,
        isPresumed: true,
      });
    });

    it('answers 404 INVOICE_PAYMENT_NOT_FOUND for a payment that does not exist or is of another invoice', async () => {
      const october = await world.invoiceOf(
        await pay({ amountCents: 100, paidOn: '2026-10-20' }, '2026-10'),
        201,
      );
      await pay({ amountCents: 100, paidOn: '2026-11-08' });

      await expectError(await remove(generateId()), 404, 'INVOICE_PAYMENT_NOT_FOUND');
      await expectError(await remove(october.payments[0]!.id), 404, 'INVOICE_PAYMENT_NOT_FOUND');
      // A month nobody wrote on has no payment either.
      await expectError(await remove(generateId(), '2026-09'), 404, 'INVOICE_PAYMENT_NOT_FOUND');
      await expectError(
        await world.send(
          'DELETE',
          `/cards/${world.checking}/invoices/2026-11/payments/${generateId()}`,
        ),
        404,
        'CARD_NOT_FOUND',
      );
      await expectError(await remove('abc'), 400, 'VALIDATION_FAILED');
    });
  });

  describe('the payment found and "Não é este"', () => {
    it('suggests the only candidate, which is presumed paid: it is not counted twice in what is left', async () => {
      const id = await marked();

      const dto = await get();

      expect(dto.paymentSuggestion).toEqual({
        transactionId: id,
        accountId: world.checking,
        amountCents: -5000,
        occurredOn: '2026-11-10',
        description: 'PAGAMENTO FATURA',
        isPresumed: true,
      });
      // Still not linked: the status does not change, but what is left already discounts it.
      expect(dto).toMatchObject({
        status: 'closed',
        paidCents: 0,
        presumedPaidCents: 5000,
        remainingCents: 0,
        payments: [],
      });
    });

    it('with two candidates and no mirror credit it is only a suggestion: the invoice stays whole', async () => {
      const best = await marked();
      await marked({ amount_cents: -4950, occurred_on: '2026-11-11' });

      const dto = await get();

      expect(dto.paymentSuggestion).toMatchObject({ transactionId: best, isPresumed: false });
      expect(dto).toMatchObject({ presumedPaidCents: 0, remainingCents: 5000 });
    });

    it('is presumed with a mirror credit on the card, even when another candidate exists', async () => {
      const chosen = await marked({ amount_cents: -4950, occurred_on: '2026-11-11' });
      await marked({ amount_cents: -5000, occurred_on: '2026-11-10' });
      await insertTestTransaction(world.database.db, world.card, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 4950,
        nature: 'invoice_payment',
        nature_set_by: 'system',
        occurred_on: '2026-11-11',
      });
      await insertTestTransaction(world.database.db, world.card, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 5000,
        nature: 'invoice_payment',
        nature_set_by: 'system',
        occurred_on: '2026-11-10',
      });

      const dto = await get();

      // Both have a mirror; the one closest to what is lacking (R$ 50,00) wins.
      expect(dto.paymentSuggestion?.transactionId).not.toBe(chosen);
      expect(dto.paymentSuggestion).toMatchObject({ amountCents: -5000, isPresumed: true });
      // The credits of the payment are not purchases: the total is still 50,00.
      expect(dto.totalCents).toBe(5000);
    });

    it('looks only between the closing and five days after the due date, inclusive', async () => {
      await marked({ occurred_on: '2026-11-04' });
      await marked({ occurred_on: '2026-11-18' });
      expect((await get()).paymentSuggestion).toBeNull();

      const edgeBefore = await marked({ occurred_on: '2026-11-05' });
      expect((await get()).paymentSuggestion?.transactionId).toBe(edgeBefore);
      await world.database.db.deleteFrom('transactions').where('id', '=', edgeBefore).execute();
      const edgeAfter = await marked({ occurred_on: '2026-11-17' });
      expect((await get()).paymentSuggestion?.transactionId).toBe(edgeAfter);
    });

    it('does not suggest a value far from what is left (without a mirror), the open invoice, or a transaction already tied', async () => {
      await marked({ amount_cents: -4899 });
      expect((await get()).paymentSuggestion).toBeNull();

      const near = await marked({ amount_cents: -5100 });
      expect((await get()).paymentSuggestion?.transactionId).toBe(near);
      await pay({ amountCents: 1000, paidOn: '2026-11-10', transactionId: near });
      expect((await get()).paymentSuggestion).toBeNull();

      // The open invoice (December) looks for no payment.
      await marked({ amount_cents: -100, occurred_on: '2026-12-10' });
      expect((await get('2026-12')).paymentSuggestion).toBeNull();
    });

    it('"Vincular": paying with the suggested transaction settles the invoice', async () => {
      const id = await marked();
      const suggested = (await get()).paymentSuggestion!;

      const dto = await world.invoiceOf(
        await pay({
          amountCents: 5000,
          paidOn: suggested.occurredOn,
          transactionId: suggested.transactionId,
        }),
        201,
      );

      expect(suggested.transactionId).toBe(id);
      expect(dto).toMatchObject({
        status: 'paid',
        paidCents: 5000,
        presumedPaidCents: 0,
        remainingCents: 0,
      });
    });

    it('"Não é este": POST dismisses it for this invoice, it does not come back, and DELETE brings it back', async () => {
      const id = await marked();
      const dismiss = (method: string) =>
        method === 'POST'
          ? world.send('POST', `${base()}/payment-suggestion/dismiss`, { transactionId: id })
          : world.send('DELETE', `${base()}/payment-suggestion/dismiss?transactionId=${id}`);

      const dismissed = await world.invoiceOf(await dismiss('POST'));
      expect(dismissed).toMatchObject({
        paymentSuggestion: null,
        presumedPaidCents: 0,
        remainingCents: 5000,
      });
      expect((await get()).paymentSuggestion).toBeNull();
      // Dismissing twice changes nothing.
      await dismiss('POST');
      expect(
        await world.database.db
          .selectFrom('invoice_payment_dismissals')
          .select('transaction_id')
          .execute(),
      ).toHaveLength(1);

      const back = await world.invoiceOf(await dismiss('DELETE'));
      expect(back.paymentSuggestion).toMatchObject({ transactionId: id });
      expect(
        await world.database.db
          .selectFrom('invoice_payment_dismissals')
          .select('transaction_id')
          .execute(),
      ).toEqual([]);
      // Undoing what was not dismissed is harmless.
      expect((await dismiss('DELETE')).status).toBe(200);
    });

    it('the next candidate shows when the first is dismissed, and the dismissal is only of this invoice', async () => {
      const first = await marked();
      const second = await marked({ amount_cents: -5040, occurred_on: '2026-11-11' });
      await world.send('POST', `${base()}/payment-suggestion/dismiss`, { transactionId: first });

      expect((await get()).paymentSuggestion).toMatchObject({
        transactionId: second,
        isPresumed: true,
      });
      // For another invoice of the card (October, due 13/10) the same transaction is out of the
      // window anyway; what matters is that no dismissal exists on it.
      const rows = await world.database.db
        .selectFrom('invoice_payment_dismissals as d')
        .innerJoin('invoices as i', 'i.id', 'd.invoice_id')
        .select(['i.month', 'd.transaction_id'])
        .execute();
      expect(rows).toEqual([{ month: '2026-11', transaction_id: first }]);
    });

    it('answers 404 CARD_NOT_FOUND and TRANSACTION_NOT_FOUND, and 400 for a body or a query that is not right', async () => {
      const path = `${base()}/payment-suggestion/dismiss`;

      await expectError(
        await world.send(
          'POST',
          `/cards/${world.checking}/invoices/2026-11/payment-suggestion/dismiss`,
          {
            transactionId: generateId(),
          },
        ),
        404,
        'CARD_NOT_FOUND',
      );
      await expectError(
        await world.send('POST', path, { transactionId: generateId() }),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      await expectError(
        await world.send('DELETE', `${path}?transactionId=${generateId()}`),
        404,
        'TRANSACTION_NOT_FOUND',
      );
      await expectError(await world.send('POST', path, {}), 400, 'VALIDATION_FAILED');
      await expectError(await world.send('DELETE', path), 400, 'VALIDATION_FAILED');
      // Nothing was written by the refusals.
      expect(await world.database.db.selectFrom('invoices').select('id').execute()).toEqual([]);
    });
  });

  it('a payment that fails in the middle writes nothing (one unit of work)', async () => {
    const id = await debit();
    await world.database.db
      .insertInto('invoices')
      .values({
        id: generateId(),
        account_id: world.card,
        month: '2026-10',
        closes_on: '2026-10-05',
        due_on: '2026-10-13',
        bank_total_cents: null,
        total_override_cents: null,
        override_note: null,
        created_at: '2026-11-01T00:00:00.000Z',
        updated_at: '2026-11-01T00:00:00.000Z',
      })
      .execute();
    await pay({ amountCents: 5000, paidOn: '2026-11-10', transactionId: id });

    // The second link is refused after the invoice was loaded and the payment registered in memory.
    await expectError(
      await pay({ amountCents: 100, paidOn: '2026-11-10', transactionId: id }, '2026-10'),
      409,
      'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
    );
    expect(await paymentRows()).toHaveLength(1);
  });
});

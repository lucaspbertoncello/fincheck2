import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';

const MISSING_PAYMENT_DAY = '2026-11-10';

// A transaction pays one thing only. One that already settles an occurrence of a recurrence is not
// the payment found of an invoice, and cannot be linked to one (the occurrence side of
// `LinkedTransactionReader`; `bills` will add its own).
describe('a transaction tied to an occurrence and the payment of an invoice', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
    // The invoice of November (closed on 05/11) has R$ 400,00 of purchases to pay.
    await insertTestTransaction(world.database.db, world.card, {
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: -40000,
      occurred_on: '2026-10-20',
    });
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  // A debit of the checking account that pays a recurrence (not an invoice).
  const debitTiedToOccurrence = async () => {
    const created = await world.send('POST', '/recurrences', {
      kind: 'expense',
      name: 'Fatura do cartão',
      expectedAmountCents: 40000,
      dateRule: { type: 'fixed_day', day: 10 },
    });
    const occurrenceId = ((await created.json()) as { occurrence: { id: string } }).occurrence.id;
    const debit = await world.transactionOf(
      await world.send('POST', '/transactions', {
        type: 'expense',
        accountId: world.checking,
        method: 'pix',
        description: 'Pix 40000',
        amountCents: 40000,
        occurredOn: MISSING_PAYMENT_DAY,
      }),
      201,
    );
    const tied = await world.send('POST', `/occurrences/${occurrenceId}/payments`, {
      transactionId: debit.id,
    });
    expect(tied.status).toBe(201);

    return debit;
  };

  it('refuses it as the payment of an invoice: 409 INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED, nothing is written', async () => {
    const debit = await debitTiedToOccurrence();

    const response = await world.send('POST', `/cards/${world.card}/invoices/2026-11/payments`, {
      amountCents: 40000,
      paidOn: MISSING_PAYMENT_DAY,
      transactionId: debit.id,
    });

    await world.expectError(response, 409, 'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED');
    const rows = await world.database.db.selectFrom('invoice_payments').selectAll().execute();
    expect(rows).toEqual([]);
    const after = await world.transactionOf(await world.send('GET', `/transactions/${debit.id}`));
    expect(after.nature).toBe('expense');
  });

  it('does not offer it as the payment found of the invoice, even when the detector marked it', async () => {
    const debit = await debitTiedToOccurrence();
    // What the detectors of the sync piece will do: mark the debit as a payment of invoice.
    await world.database.db
      .updateTable('transactions')
      .set({ nature: 'invoice_payment', nature_set_by: 'system' })
      .where('id', '=', debit.id)
      .execute();

    const response = await world.send('GET', `/cards/${world.card}/invoices/2026-11`);
    const invoice = (await response.json()) as { totalCents: number; paymentSuggestion: unknown };

    // The invoice does have R$ 400,00 to pay: the missing suggestion is the link's doing.
    expect(invoice.totalCents).toBe(40000);
    expect(invoice.paymentSuggestion).toBeNull();
  });

  it('offers it again once the occurrence lets it go', async () => {
    const debit = await debitTiedToOccurrence();
    await world.database.db
      .updateTable('transactions')
      .set({ nature: 'invoice_payment', nature_set_by: 'system' })
      .where('id', '=', debit.id)
      .execute();
    const link = await world.database.db
      .selectFrom('occurrence_payments')
      .select('id')
      .executeTakeFirstOrThrow();
    const occurrence = await world.database.db
      .selectFrom('occurrence_payments')
      .select('occurrence_id')
      .executeTakeFirstOrThrow();
    await world.send('DELETE', `/occurrences/${occurrence.occurrence_id}/payments/${link.id}`);

    const response = await world.send('GET', `/cards/${world.card}/invoices/2026-11`);
    const invoice = (await response.json()) as {
      paymentSuggestion: { transactionId: string } | null;
    };

    expect(invoice.paymentSuggestion?.transactionId).toBe(debit.id);
  });
});

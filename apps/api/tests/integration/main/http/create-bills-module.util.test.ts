import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

// The app `main` builds (`createApp`), not the test app of one module: each test needs one reader,
// port or route that `createApp` has to plug in for `bills`, and fails if it is left out. The links
// go both ways, because a transaction pays one thing only: what a bill holds is closed to the
// invoices and the occurrences, and what they hold is closed to the bills.
describe('createApp wires bills into transactions, invoices and recurrences', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const debit = (cents = 10990, on = '2026-10-10') =>
    insertTestExpense(world.database.db, world.checking, { cents, on });

  const newBill = async (body: Record<string, unknown>) => {
    const response = await world.send('POST', '/bills', {
      direction: 'payable',
      kind: 'general',
      description: 'Conta de luz',
      amountCents: 20000,
      ...body,
    });
    expect(response.status).toBe(201);

    return billDtoSchema.parse(await response.json());
  };

  const payInvoice = (transactionId: string, amountCents = 10990) =>
    world.send('POST', `/cards/${world.card}/invoices/2026-11/payments`, {
      amountCents,
      paidOn: '2026-10-10',
      transactionId,
    });

  it('mounts the routes of bills: they answer, they are not 404, and the fixed paths win over /bills/:id', async () => {
    for (const path of [
      '/bills',
      '/bills/counterparties',
      '/bills/payment-candidates?direction=payable',
    ]) {
      expect((await world.send('GET', path)).status).toBe(200);
    }
  });

  it('shows the link of the bill on the transaction (the links reader)', async () => {
    const pix = await debit();
    const bill = await newBill({ payment: { transactionId: pix } });

    const after = transactionDtoSchema.parse(
      await (await world.send('GET', `/transactions/${pix}`)).json(),
    );

    expect(after.links.bill).toEqual({
      billId: bill.id,
      description: 'Conta de luz',
      counterparty: null,
      role: 'payment',
      amountCents: 10990,
    });
  });

  it('puts the effects of the bill on the transaction (the writer of transactions)', async () => {
    const pix = await insertTestIncome(world.database.db, world.checking, {
      cents: 5800,
      on: '2026-10-20',
    });

    await newBill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      amountCents: 11600,
      payment: { transactionId: pix },
    });

    const after = transactionDtoSchema.parse(
      await (await world.send('GET', `/transactions/${pix}`)).json(),
    );
    expect(after.nature).toBe('reimbursed');
  });

  it('refuses to pay an invoice with a transaction that pays a bill (the linked reader of invoices)', async () => {
    const pix = await debit();
    await newBill({ payment: { transactionId: pix } });

    await world.expectError(
      await payInvoice(pix),
      409,
      'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('refuses to settle an occurrence with a transaction that pays a bill (the link of an occurrence)', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const pix = await debit();
    await newBill({ payment: { transactionId: pix } });

    await world.expectError(
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: pix }),
      409,
      'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('refuses to start a recurrence from a transaction that pays a bill (the creation of a recurrence)', async () => {
    const pix = await debit();
    await newBill({ payment: { transactionId: pix } });

    await world.expectError(
      await world.send('POST', '/recurrences', {
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 10 },
        startsMonth: '2026-10',
        linkTransactionId: pix,
      }),
      409,
      'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('does not offer to an occurrence a transaction that pays a bill (the candidates of an occurrence)', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const pix = await debit();
    const ids = async () =>
      (
        (await (await world.send('GET', `/occurrences/${occurrence?.id}/candidates`)).json()) as {
          items: { transactionId: string }[];
        }
      ).items.map((item) => item.transactionId);
    expect(await ids()).toContain(pix);

    await newBill({ payment: { transactionId: pix } });

    expect(await ids()).not.toContain(pix);
  });

  it('does not offer the queue candidates of a recurrence for a transaction that pays a bill', async () => {
    await world.create({
      kind: 'income',
      name: 'Mesada',
      expectedAmountCents: 85000,
      matchText: 'pai',
      maxPayments: 2,
      dateRule: { type: 'any_day' },
    });
    const pix = await insertTestIncome(world.database.db, world.checking, {
      cents: 60000,
      on: '2026-10-04',
      counterparty: 'PAI',
    });
    const candidatesOf = async () => {
      const queue = reviewQueueDtoSchema.parse(
        await (await world.send('GET', '/transactions/review-queue')).json(),
      );

      return queue.items.find((item) => item.transaction.id === pix)?.recurrenceCandidates;
    };
    expect(await candidatesOf()).toHaveLength(1);

    await newBill({ direction: 'receivable', amountCents: 60000, payment: { transactionId: pix } });

    expect((await candidatesOf()) ?? []).toEqual([]);
  });

  it('refuses to tie to a bill a transaction that pays an invoice (the linked reader from invoices)', async () => {
    const pix = await debit();
    expect((await payInvoice(pix)).status).toBe(201);
    const bill = await newBill({});

    await world.expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix }),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('refuses to tie to a bill a transaction that settles an occurrence (the linked reader from recurrences)', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const pix = await debit();
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: pix });
    const bill = await newBill({});

    await world.expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix }),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
    await world.expectError(
      await world.send('POST', '/bills', {
        direction: 'payable',
        kind: 'general',
        description: 'x',
        amountCents: 20000,
        payment: { transactionId: pix },
      }),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('does not offer to a bill what pays an invoice or settles an occurrence (the candidates of a bill)', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const forOccurrence = await debit(10990, '2026-10-10');
    const forInvoice = await debit(5000, '2026-10-11');
    const free = await debit(700, '2026-10-12');
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
      transactionId: forOccurrence,
    });
    expect((await payInvoice(forInvoice, 5000)).status).toBe(201);
    const bill = await newBill({});

    const response = await world.send('GET', `/bills/${bill.id}/payment-candidates`);
    const fresh = await world.send('GET', '/bills/payment-candidates?direction=payable');

    for (const reply of [response, fresh]) {
      const ids = ((await reply.json()) as { items: { transactionId: string }[] }).items.map(
        (item) => item.transactionId,
      );
      expect(ids).toEqual([free]);
    }
  });
});

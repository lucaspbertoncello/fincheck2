import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import {
  createBillsTestWorld,
  type BillsTestWorld,
} from '#tests/support/bills/bill/create-bills-test-world.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

let world: BillsTestWorld;

beforeEach(async () => {
  world = await createBillsTestWorld();
});

afterEach(async () => {
  await world.destroy();
});

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
}

const reimbursement = (extra: Record<string, unknown> = {}) => ({
  direction: 'receivable',
  kind: 'friend',
  counterparty: 'Júlia',
  description: 'Jantar no Mocotó',
  amountCents: 11600,
  ...extra,
});

describe('POST /bills/:id/payments', () => {
  it('records a payment by hand: 201 with the payment inside, partial', async () => {
    const bill = await world.bill({ amountCents: 45000 });

    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 15000,
      paidOn: '2026-11-02',
    });

    expect(response.status).toBe(201);
    const body = billDtoSchema.parse(await response.json());
    expect(body).toMatchObject({ paidCents: 15000, remainingCents: 30000, status: 'partial' });
    expect(body.payments).toEqual([
      {
        id: body.payments[0]?.id,
        amountCents: 15000,
        paidOn: '2026-11-02',
        transactionId: null,
        description: null,
      },
    ]);
  });

  it('two payments that add up to the value settle the bill', async () => {
    const bill = await world.bill({ amountCents: 45000 });

    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 15000,
      paidOn: '2026-11-02',
    });
    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 30000,
      paidOn: '2026-11-03',
    });

    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 45000,
      remainingCents: 0,
      status: 'settled',
    });
  });

  it('tied to a transaction: the amount and the day default to the transaction ones', async () => {
    const pix = await world.expense(15000, '2026-11-03', { description: 'Pix para Rafa' });
    const bill = await world.bill({ kind: 'friend', counterparty: 'Rafa', amountCents: 45000 });

    const response = await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    expect(response.status).toBe(201);
    expect(billDtoSchema.parse(await response.json()).payments).toMatchObject([
      {
        amountCents: 15000,
        paidOn: '2026-11-03',
        transactionId: pix,
        description: 'Pix para Rafa',
      },
    ]);
  });

  it('may be smaller than the transaction and on another day', async () => {
    const pix = await world.expense(15000, '2026-11-03');
    const bill = await world.bill({ amountCents: 45000 });

    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      transactionId: pix,
      amountCents: 10000,
      paidOn: '2026-11-05',
    });

    expect(billDtoSchema.parse(await response.json()).payments).toMatchObject([
      { amountCents: 10000, paidOn: '2026-11-05' },
    ]);
  });

  it('puts the category of the bill on the transaction, with the origin bill', async () => {
    const categoryId = await world.category('expense');
    const pix = await world.expense(15000, '2026-11-03');
    const bill = await world.bill({ categoryId });

    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    expect(await world.transaction(pix)).toMatchObject({
      category_id: categoryId,
      category_source: 'bill',
      nature: 'expense',
    });
  });

  it('a smaller receipt turns the whole money into reimbursed (outside the income)', async () => {
    const pix = await world.income(5800, '2026-11-04');
    const bill = await world.bill(reimbursement());

    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    expect(await world.transaction(pix)).toMatchObject({ nature: 'reimbursed', splits: [] });
  });

  it('a receipt bigger than what is owed splits: what is owed is reimbursed, the rest stays income', async () => {
    const pix = await world.income(20000, '2026-11-04');
    const bill = await world.bill(reimbursement());

    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      transactionId: pix,
      amountCents: 11600,
    });

    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 11600,
      status: 'settled',
    });
    const row = await world.transaction(pix);
    expect(row.nature).toBe('income');
    expect(row.splits.map((part) => [part.amount_cents, part.nature])).toEqual([
      [8400, 'income'],
      [11600, 'reimbursed'],
    ]);
  });

  it('a receipt bigger than what is owed, with no amount: it splits at what is missing (no 422)', async () => {
    const pix = await world.income(20000, '2026-11-04');
    const bill = await world.bill(reimbursement());

    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      transactionId: pix,
    });

    expect(response.status).toBe(201);
    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 11600,
      remainingCents: 0,
      status: 'settled',
    });
    const row = await world.transaction(pix);
    expect(row.splits.map((part) => [part.amount_cents, part.nature])).toEqual([
      [8400, 'income'],
      [11600, 'reimbursed'],
    ]);
  });

  it('the receipt that passes what is missing after a partial one splits at what is still missing', async () => {
    const first = await world.income(5000, '2026-11-02');
    const second = await world.income(20000, '2026-11-04');
    const bill = await world.bill(reimbursement());
    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: first });

    const response = await world.send('POST', `/bills/${bill.id}/payments`, {
      transactionId: second,
    });

    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 11600,
      status: 'settled',
    });
    expect((await world.transaction(second)).splits.map((part) => part.amount_cents)).toEqual([
      13400, 6600,
    ]);
  });

  it('on a bill of a general kind or one I owe, the money bigger than the bill is still 422', async () => {
    const pix = await world.expense(50000, '2026-11-04');
    const income = await world.income(50000, '2026-11-04');
    const owed = await world.bill({ amountCents: 45000, kind: 'friend', counterparty: 'Rafa' });
    const general = await world.bill({ direction: 'receivable', amountCents: 45000 });

    await expectError(
      await world.send('POST', `/bills/${owed.id}/payments`, { transactionId: pix }),
      422,
      'BILL_OVERPAID',
    );
    await expectError(
      await world.send('POST', `/bills/${general.id}/payments`, { transactionId: income }),
      422,
      'BILL_OVERPAID',
    );
  });

  it('shows the link of the payment in the transaction', async () => {
    const pix = await world.expense(15000, '2026-11-03');
    const bill = await world.bill({ kind: 'friend', counterparty: 'Rafa' });
    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    const response = await world.send('GET', `/transactions/${pix}`);

    expect(((await response.json()) as { links: { bill: unknown } }).links.bill).toEqual({
      billId: bill.id,
      description: 'Conta de luz',
      counterparty: 'Rafa',
      role: 'payment',
      amountCents: 15000,
    });
  });

  it('422 BILL_OVERPAID when it passes what is missing, one cent over included', async () => {
    const bill = await world.bill({ amountCents: 45000 });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 15000,
      paidOn: '2026-11-02',
    });

    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, {
        amountCents: 30001,
        paidOn: '2026-11-03',
      }),
      422,
      'BILL_OVERPAID',
    );
    const exact = await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 30000,
      paidOn: '2026-11-03',
    });
    expect(exact.status).toBe(201);
  });

  it('422 BILL_ALREADY_SETTLED on a settled bill', async () => {
    const bill = await world.bill({ amountCents: 1000 });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 1000,
      paidOn: '2026-11-02',
    });

    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, {
        amountCents: 1,
        paidOn: '2026-11-03',
      }),
      422,
      'BILL_ALREADY_SETTLED',
    );
  });

  it('422 when the transaction goes the wrong way, is not income or expense, or is ignored', async () => {
    const bill = await world.bill({});
    const credit = await world.income(1000, '2026-11-03');
    const transfer = await world.expense(1000, '2026-11-03', { overrides: { nature: 'transfer' } });
    const ignored = await world.expense(1000, '2026-11-03', {
      overrides: { ignored_at: '2026-11-04T00:00:00.000Z' },
    });

    for (const transactionId of [credit, transfer, ignored]) {
      await expectError(
        await world.send('POST', `/bills/${bill.id}/payments`, { transactionId }),
        422,
        'BILL_PAYMENT_TRANSACTION_INVALID',
      );
    }
  });

  it('422 when the payment passes the value of the transaction', async () => {
    const pix = await world.expense(1000, '2026-11-03');
    const bill = await world.bill({});

    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, {
        transactionId: pix,
        amountCents: 1001,
      }),
      422,
      'BILL_PAYMENT_TRANSACTION_INVALID',
    );
  });

  it('409 when the transaction pays another bill or is the origin of one', async () => {
    const paid = await world.expense(1000, '2026-11-03');
    const origin = await world.expense(8000, '2026-11-03');
    await world.bill({ payment: { transactionId: paid } });
    await world.bill(
      reimbursement({ amountCents: 4000, origin: { transactionId: origin, amountCents: 4000 } }),
    );
    const bill = await world.bill({});

    for (const transactionId of [paid, origin]) {
      await expectError(
        await world.send('POST', `/bills/${bill.id}/payments`, { transactionId }),
        409,
        'BILL_TRANSACTION_ALREADY_LINKED',
      );
    }
  });

  it('409 when the same transaction is tied twice to the same bill', async () => {
    const pix = await world.expense(1000, '2026-11-03');
    const bill = await world.bill({});
    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix }),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('404 for the bill and for the transaction; a failure writes nothing', async () => {
    const bill = await world.bill({});

    await expectError(
      await world.send('POST', `/bills/${MISSING}/payments`, {
        amountCents: 1,
        paidOn: '2026-11-02',
      }),
      404,
      'BILL_NOT_FOUND',
    );
    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: MISSING }),
      404,
      'TRANSACTION_NOT_FOUND',
    );
    expect(await world.db.selectFrom('bill_payments').selectAll().execute()).toEqual([]);
  });

  it('400 for a payment by hand with no amount or no day; 401 without the token', async () => {
    const bill = await world.bill({});

    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { paidOn: '2026-11-02' }),
      400,
      'VALIDATION_FAILED',
    );
    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, { amountCents: 100 }),
      400,
      'VALIDATION_FAILED',
    );
    await expectError(
      await world.send('POST', `/bills/${bill.id}/payments`, {
        amountCents: 0,
        paidOn: '2026-11-02',
      }),
      400,
      'VALIDATION_FAILED',
    );
    const noToken = await world.app.request(`/bills/${bill.id}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [LOCAL_TOKEN_HEADER]: 'wrong' },
      body: '{}',
    });
    expect(noToken.status).toBe(401);
  });
});

describe('DELETE /bills/:id/payments/:paymentId', () => {
  it('undoes a payment by hand: 204, the bill is open again', async () => {
    const bill = await world.bill({});
    const paid = billDtoSchema.parse(
      await (
        await world.send('POST', `/bills/${bill.id}/payments`, {
          amountCents: 1000,
          paidOn: '2026-11-02',
        })
      ).json(),
    );

    const response = await world.send(
      'DELETE',
      `/bills/${bill.id}/payments/${paid.payments[0]?.id}`,
    );

    expect(response.status).toBe(204);
    const after = billDtoSchema.parse(await (await world.send('GET', `/bills/${bill.id}`)).json());
    expect(after).toMatchObject({ paidCents: 0, status: 'open', payments: [] });
  });

  it('a receipt goes back to income, whole or split', async () => {
    const whole = await world.income(5800, '2026-11-04');
    const big = await world.income(20000, '2026-11-04');
    const first = await world.bill(reimbursement());
    const second = await world.bill(reimbursement());
    const a = billDtoSchema.parse(
      await (
        await world.send('POST', `/bills/${first.id}/payments`, { transactionId: whole })
      ).json(),
    );
    const b = billDtoSchema.parse(
      await (
        await world.send('POST', `/bills/${second.id}/payments`, {
          transactionId: big,
          amountCents: 11600,
        })
      ).json(),
    );

    await world.send('DELETE', `/bills/${first.id}/payments/${a.payments[0]?.id}`);
    await world.send('DELETE', `/bills/${second.id}/payments/${b.payments[0]?.id}`);

    expect(await world.transaction(whole)).toMatchObject({ nature: 'income', splits: [] });
    expect(await world.transaction(big)).toMatchObject({ nature: 'income', splits: [] });
  });

  it('the Pix paid to a friend stays an expense, and the category of the bill goes away', async () => {
    const categoryId = await world.category('expense');
    const pix = await world.expense(15000, '2026-11-03');
    const bill = await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      categoryId,
      payment: { transactionId: pix },
    });

    const response = await world.send(
      'DELETE',
      `/bills/${bill.id}/payments/${bill.payments[0]?.id}`,
    );

    expect(response.status).toBe(204);
    expect(await world.transaction(pix)).toMatchObject({
      nature: 'expense',
      category_id: null,
      category_source: null,
    });
  });

  it('frees the transaction to pay something else', async () => {
    const pix = await world.expense(1000, '2026-11-03');
    const first = await world.bill({ payment: { transactionId: pix } });
    await world.send('DELETE', `/bills/${first.id}/payments/${first.payments[0]?.id}`);
    const second = await world.bill({});

    const response = await world.send('POST', `/bills/${second.id}/payments`, {
      transactionId: pix,
    });

    expect(response.status).toBe(201);
  });

  it('404 BILL_NOT_FOUND, and BILL_PAYMENT_NOT_FOUND for one that is not of this bill', async () => {
    const bill = await world.bill({});
    const other = await world.bill({});
    const paid = billDtoSchema.parse(
      await (
        await world.send('POST', `/bills/${other.id}/payments`, {
          amountCents: 1000,
          paidOn: '2026-11-02',
        })
      ).json(),
    );

    await expectError(
      await world.send('DELETE', `/bills/${MISSING}/payments/${MISSING}`),
      404,
      'BILL_NOT_FOUND',
    );
    await expectError(
      await world.send('DELETE', `/bills/${bill.id}/payments/${MISSING}`),
      404,
      'BILL_PAYMENT_NOT_FOUND',
    );
    await expectError(
      await world.send('DELETE', `/bills/${bill.id}/payments/${paid.payments[0]?.id}`),
      404,
      'BILL_PAYMENT_NOT_FOUND',
    );
  });
});

type Candidate = { transactionId: string; amountCents: number; occurredOn: string };

async function candidatesOf(path: string): Promise<Candidate[]> {
  const response = await world.send('GET', path);
  expect(response.status).toBe(200);

  return ((await response.json()) as { items: Candidate[] }).items;
}

describe('GET /bills/:id/payment-candidates', () => {
  it('a payable bill offers the debits of nature expense, most recent first', async () => {
    const older = await world.expense(1000, '2026-10-20');
    const newer = await world.expense(2000, '2026-11-05');
    await world.income(3000, '2026-11-05');
    const bill = await world.bill({});

    const items = await candidatesOf(`/bills/${bill.id}/payment-candidates`);

    expect(items.map((item) => item.transactionId)).toEqual([newer, older]);
    expect(items[0]).toMatchObject({ amountCents: -2000, occurredOn: '2026-11-05' });
  });

  it('a receivable bill offers the credits, with the positive sign', async () => {
    await world.expense(1000, '2026-11-05');
    const credit = await world.income(3000, '2026-11-05');
    const bill = await world.bill(reimbursement());

    const items = await candidatesOf(`/bills/${bill.id}/payment-candidates`);

    expect(items).toMatchObject([{ transactionId: credit, amountCents: 3000 }]);
  });

  it('the ones that fit the name of the person come first', async () => {
    const other = await world.expense(1000, '2026-11-05', { description: 'Padaria' });
    const rafa = await world.expense(2000, '2026-10-01', { description: 'Pix para RAFAEL' });
    const bill = await world.bill({ kind: 'friend', counterparty: 'Rafael' });

    const items = await candidatesOf(`/bills/${bill.id}/payment-candidates`);

    expect(items.map((item) => item.transactionId)).toEqual([rafa, other]);
  });

  it('leaves out the ignored, the split, the transfers, the ones outside 90 days and the future', async () => {
    const good = await world.expense(1000, '2026-08-08');
    await world.expense(1000, '2026-08-07');
    await world.expense(1000, '2026-11-07');
    await world.expense(1000, '2026-11-01', {
      overrides: { ignored_at: '2026-11-02T00:00:00.000Z' },
    });
    await world.expense(1000, '2026-11-01', { overrides: { nature: 'transfer' } });
    const split = await world.expense(1000, '2026-11-01');
    await world.db
      .insertInto('transaction_splits')
      .values([
        {
          id: 's1',
          transaction_id: split,
          position: 1,
          amount_cents: -500,
          nature: 'expense',
          category_id: null,
          description: null,
        },
        {
          id: 's2',
          transaction_id: split,
          position: 2,
          amount_cents: -500,
          nature: 'expense',
          category_id: null,
          description: null,
        },
      ])
      .execute();
    const bill = await world.bill({});

    const items = await candidatesOf(`/bills/${bill.id}/payment-candidates`);

    expect(items.map((item) => item.transactionId)).toEqual([good]);
  });

  it('leaves out what is already tied to any bill, as payment or as origin', async () => {
    const paid = await world.expense(1000, '2026-11-01');
    const origin = await world.expense(8000, '2026-11-01');
    const free = await world.expense(500, '2026-11-01');
    await world.bill({ payment: { transactionId: paid } });
    await world.bill(
      reimbursement({ amountCents: 4000, origin: { transactionId: origin, amountCents: 4000 } }),
    );
    const bill = await world.bill({});

    const items = await candidatesOf(`/bills/${bill.id}/payment-candidates`);

    expect(items.map((item) => item.transactionId)).toEqual([free]);
  });

  it('leaves out a purchase on the credit card: it is paid by the invoice, not by a Pix', async () => {
    const card = await world.expense(30000, '2026-11-01', {
      overrides: { method: 'credit' },
    });
    const pix = await world.expense(15000, '2026-11-02');
    const bill = await world.bill({});

    expect(
      (await candidatesOf(`/bills/${bill.id}/payment-candidates`)).map((i) => i.transactionId),
    ).toEqual([pix]);
    expect(
      (await candidatesOf('/bills/payment-candidates?direction=payable')).map(
        (i) => i.transactionId,
      ),
    ).toEqual([pix]);
    expect(card).not.toBe(pix);
  });

  it('offers 30 at most', async () => {
    for (let day = 0; day < 35; day += 1) {
      await world.expense(100 + day, '2026-10-15');
    }
    const bill = await world.bill({});

    expect(await candidatesOf(`/bills/${bill.id}/payment-candidates`)).toHaveLength(30);
  });

  it('404 BILL_NOT_FOUND', async () => {
    await expectError(
      await world.send('GET', `/bills/${MISSING}/payment-candidates`),
      404,
      'BILL_NOT_FOUND',
    );
  });
});

describe('GET /bills/payment-candidates', () => {
  it('offers the candidates before the debt exists, the ones of the person first', async () => {
    const other = await world.expense(1000, '2026-11-05', { description: 'Padaria' });
    const rafa = await world.expense(15000, '2026-11-01', { description: 'Pix para Rafa' });

    const items = await candidatesOf(
      '/bills/payment-candidates?direction=payable&counterparty=Rafa',
    );

    expect(items.map((item) => item.transactionId)).toEqual([rafa, other]);
  });

  it('is not taken for the id of a bill, and needs the direction', async () => {
    const credit = await world.income(3000, '2026-11-05');

    const items = await candidatesOf('/bills/payment-candidates?direction=receivable');
    const missing = await world.send('GET', '/bills/payment-candidates');

    expect(items.map((item) => item.transactionId)).toEqual([credit]);
    await expectError(missing, 400, 'VALIDATION_FAILED');
  });
});

describe('payment suggestion dismissal', () => {
  it('"Não é este" takes the transaction out of the candidates of the bill only; the undo brings it back', async () => {
    const pix = await world.expense(1000, '2026-11-05');
    const bill = await world.bill({});
    const other = await world.bill({});

    const dismissed = await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: pix,
    });

    expect(dismissed.status).toBe(200);
    expect(billDtoSchema.parse(await dismissed.json()).id).toBe(bill.id);
    expect(await candidatesOf(`/bills/${bill.id}/payment-candidates`)).toEqual([]);
    expect(await candidatesOf(`/bills/${other.id}/payment-candidates`)).toHaveLength(1);

    const undone = await world.send(
      'DELETE',
      `/bills/${bill.id}/payment-suggestion/dismiss?transactionId=${pix}`,
    );

    expect(undone.status).toBe(200);
    expect(await candidatesOf(`/bills/${bill.id}/payment-candidates`)).toHaveLength(1);
  });

  it('repeating either one changes nothing', async () => {
    const pix = await world.expense(1000, '2026-11-05');
    const bill = await world.bill({});

    await world.send('DELETE', `/bills/${bill.id}/payment-suggestion/dismiss?transactionId=${pix}`);
    await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: pix,
    });
    const again = await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: pix,
    });

    expect(again.status).toBe(200);
    expect(await world.db.selectFrom('bill_payment_dismissals').selectAll().execute()).toHaveLength(
      1,
    );
  });

  it('404 for the bill and for the transaction; 400 without the transaction', async () => {
    const bill = await world.bill({});

    await expectError(
      await world.send('POST', `/bills/${MISSING}/payment-suggestion/dismiss`, {
        transactionId: MISSING,
      }),
      404,
      'BILL_NOT_FOUND',
    );
    await expectError(
      await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
        transactionId: MISSING,
      }),
      404,
      'TRANSACTION_NOT_FOUND',
    );
    await expectError(
      await world.send(
        'DELETE',
        `/bills/${bill.id}/payment-suggestion/dismiss?transactionId=${MISSING}`,
      ),
      404,
      'TRANSACTION_NOT_FOUND',
    );
    await expectError(
      await world.send(
        'DELETE',
        `/bills/${MISSING}/payment-suggestion/dismiss?transactionId=${MISSING}`,
      ),
      404,
      'BILL_NOT_FOUND',
    );
    await expectError(
      await world.send('DELETE', `/bills/${bill.id}/payment-suggestion/dismiss`),
      400,
      'VALIDATION_FAILED',
    );
  });

  it('tying the transaction as the payment forgets the dismissal', async () => {
    const pix = await world.expense(1000, '2026-11-05');
    const bill = await world.bill({});
    await world.send('POST', `/bills/${bill.id}/payment-suggestion/dismiss`, {
      transactionId: pix,
    });

    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });

    expect(await world.db.selectFrom('bill_payment_dismissals').selectAll().execute()).toEqual([]);
  });
});

describe('the paid amount never passes the value of the bill', () => {
  it('ignore the Pix, pay by hand, unignore: the paid amount stays at the value', async () => {
    const pix = await world.expense(10000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: pix } });
    expect(bill.status).toBe('settled');

    await world.send('POST', `/transactions/${pix}/ignore`);
    const reopened = billDtoSchema.parse(
      await (await world.send('GET', `/bills/${bill.id}`)).json(),
    );
    expect(reopened).toMatchObject({ paidCents: 0, status: 'open' });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 10000,
      paidOn: '2026-11-04',
    });
    await world.send('POST', `/transactions/${pix}/unignore`);

    const response = await world.send('GET', `/bills/${bill.id}`);
    const body = billDtoSchema.parse(await response.json());
    expect(body).toMatchObject({ amountCents: 10000, paidCents: 10000, remainingCents: 0 });
    expect(body.status).toBe('settled');
    expect(body.payments.reduce((sum, payment) => sum + payment.amountCents, 0)).toBe(10000);
    // The Pix is the earlier payment (2 November), so it keeps what it is worth; the hand one is cut.
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({ transactionId: pix, amountCents: 10000 });
  });

  it('cuts the later payment to what is missing, in the order paidOn, createdAt, id', async () => {
    const first = await world.expense(6000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: first } });
    await world.send('POST', `/transactions/${first}/ignore`);
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 7000,
      paidOn: '2026-11-03',
    });
    await world.send('POST', `/transactions/${first}/unignore`);

    const body = billDtoSchema.parse(await (await world.send('GET', `/bills/${bill.id}`)).json());

    expect(body.paidCents).toBe(10000);
    expect(body.payments.map((payment) => payment.amountCents)).toEqual([6000, 4000]);
    expect(body.payments.map((payment) => payment.paidOn)).toEqual(['2026-11-02', '2026-11-03']);
  });

  it('ignore, lower the value of the bill, unignore: the Pix is cut to the new value', async () => {
    const pix = await world.expense(10000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: pix } });
    await world.send('POST', `/transactions/${pix}/ignore`);
    await world.send('PATCH', `/bills/${bill.id}`, { amountCents: 4000 });
    await world.send('POST', `/transactions/${pix}/unignore`);

    const body = billDtoSchema.parse(await (await world.send('GET', `/bills/${bill.id}`)).json());

    expect(body).toMatchObject({ amountCents: 4000, paidCents: 4000, remainingCents: 0 });
    expect(body.status).toBe('settled');
    expect(body.payments.map((payment) => payment.amountCents)).toEqual([4000]);
  });
});

describe('the nature of a transaction that pays a bill is locked', () => {
  const patch = (id: string, body: unknown) => world.send('PATCH', `/transactions/${id}`, body);

  async function billState(id: string) {
    return billDtoSchema.parse(await (await world.send('GET', `/bills/${id}`)).json());
  }

  it('refuses to turn the Pix that settled a bill into a transfer: 422, and the bill stays settled', async () => {
    const pix = await world.expense(10000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: pix } });

    await expectError(await patch(pix, { nature: 'transfer' }), 422, 'TRANSACTION_LINKED_TO_BILL');

    expect((await world.transaction(pix)).nature).toBe('expense');
    expect(await billState(bill.id)).toMatchObject({ paidCents: 10000, status: 'settled' });
  });

  it('refuses the same for a received money on a bill of a general receipt', async () => {
    const pix = await world.income(10000, '2026-11-02');
    await world.bill({
      direction: 'receivable',
      kind: 'general',
      amountCents: 10000,
      payment: { transactionId: pix },
    });

    await expectError(await patch(pix, { nature: 'transfer' }), 422, 'TRANSACTION_LINKED_TO_BILL');
    expect((await world.transaction(pix)).nature).toBe('income');
  });

  it('refuses to take the linked transaction as the other leg of a transfer, and writes nothing', async () => {
    const savings = await insertTestAccount(world.db, { name: 'Poupança' });
    const pix = await world.expense(10000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: pix } });
    const credit = await insertTestIncome(world.db, savings, { cents: 10000, on: '2026-11-02' });

    await expectError(
      await patch(credit, { nature: 'transfer', transferCounterpartId: pix }),
      422,
      'TRANSACTION_LINKED_TO_BILL',
    );

    expect((await world.transaction(pix)).nature).toBe('expense');
    expect((await world.transaction(credit)).nature).toBe('income');
    expect(await billState(bill.id)).toMatchObject({ paidCents: 10000, status: 'settled' });
  });

  it('accepts the nature it already has and other edits, and lets go once the payment is undone', async () => {
    const pix = await world.expense(10000, '2026-11-02');
    const bill = await world.bill({ amountCents: 10000, payment: { transactionId: pix } });

    expect((await patch(pix, { nature: 'expense' })).status).toBe(200);
    expect((await patch(pix, { editNote: 'nota' })).status).toBe(200);
    await world.send('DELETE', `/bills/${bill.id}/payments/${bill.payments[0]?.id}`);

    expect((await patch(pix, { nature: 'transfer' })).status).toBe(200);
  });
});

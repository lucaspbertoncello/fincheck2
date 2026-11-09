import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import {
  createBillsTestWorld,
  type BillsTestWorld,
} from '#tests/support/bills/bill/create-bills-test-world.util.ts';

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

describe('POST /bills', () => {
  it('creates a general bill to pay: 201, open, nothing paid', async () => {
    const response = await world.send('POST', '/bills', {
      direction: 'payable',
      kind: 'general',
      description: 'Conta de luz',
      amountCents: 18990,
      dueOn: '2026-11-20',
    });

    expect(response.status).toBe(201);
    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      direction: 'payable',
      kind: 'general',
      description: 'Conta de luz',
      counterparty: null,
      amountCents: 18990,
      paidCents: 0,
      remainingCents: 18990,
      dueOn: '2026-11-20',
      categoryId: null,
      status: 'open',
      origin: null,
      payments: [],
    });
  });

  it('a bill with no day is "sem data"; a past day is overdue', async () => {
    const undated = await world.bill({});
    const late = await world.bill({ dueOn: '2026-10-31' });

    expect(undated).toMatchObject({ dueOn: null, status: 'open' });
    expect(late.status).toBe('overdue');
  });

  it('creates a debt I owe a friend, with the category of what was paid', async () => {
    const categoryId = await world.category('expense');

    const bill = await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      description: 'Ingresso do show',
      categoryId,
    });

    expect(bill).toMatchObject({ kind: 'friend', counterparty: 'Rafa', categoryId });
  });

  it('answers 400 for a friend debt with no person, 400 for a bad body, 401 with no token', async () => {
    const noPerson = await world.send('POST', '/bills', {
      direction: 'payable',
      kind: 'friend',
      description: 'Jantar',
      amountCents: 1000,
    });
    const zero = await world.send('POST', '/bills', {
      direction: 'payable',
      kind: 'general',
      description: 'Jantar',
      amountCents: 0,
    });
    const reimbursementWithCategory = await world.send('POST', '/bills', {
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      description: 'Jantar',
      amountCents: 1000,
      categoryId: await world.category('income'),
    });
    const noToken = await world.app.request('/bills', {
      method: 'POST',
      headers: { 'content-type': 'application/json', [LOCAL_TOKEN_HEADER]: 'wrong' },
      body: '{}',
    });

    await expectError(noPerson, 400, 'VALIDATION_FAILED');
    await expectError(zero, 400, 'VALIDATION_FAILED');
    await expectError(reimbursementWithCategory, 400, 'VALIDATION_FAILED');
    expect(noToken.status).toBe(401);
  });

  it('404 for a category and for transactions that do not exist', async () => {
    const payable = { direction: 'payable', kind: 'friend', counterparty: 'Rafa' };

    await expectError(
      await world.send('POST', '/bills', {
        ...payable,
        description: 'x',
        amountCents: 1000,
        categoryId: MISSING,
      }),
      404,
      'CATEGORY_NOT_FOUND',
    );
    await expectError(
      await world.send('POST', '/bills', {
        ...payable,
        description: 'x',
        amountCents: 1000,
        payment: { transactionId: MISSING },
      }),
      404,
      'TRANSACTION_NOT_FOUND',
    );
    await expectError(
      await world.send('POST', '/bills', {
        direction: 'receivable',
        kind: 'friend',
        counterparty: 'Júlia',
        description: 'x',
        amountCents: 1000,
        origin: { transactionId: MISSING },
      }),
      404,
      'TRANSACTION_NOT_FOUND',
    );
  });

  it('422 when the category has the kind of the other direction', async () => {
    const income = await world.category('income');

    await expectError(
      await world.send('POST', '/bills', {
        direction: 'payable',
        kind: 'general',
        description: 'x',
        amountCents: 1000,
        categoryId: income,
      }),
      422,
      'BILL_CATEGORY_KIND_MISMATCH',
    );
  });

  it('422 when the origin is not on a receivable friend debt', async () => {
    const dinner = await world.expense(8000, '2026-11-01');

    await expectError(
      await world.send('POST', '/bills', {
        direction: 'payable',
        kind: 'friend',
        counterparty: 'Rafa',
        description: 'x',
        amountCents: 1000,
        origin: { transactionId: dinner },
      }),
      422,
      'BILL_ORIGIN_NOT_ALLOWED',
    );
  });
});

describe('POST /bills with the origin ("você pagou")', () => {
  const receivable = (extra: Record<string, unknown>) => ({
    direction: 'receivable',
    kind: 'friend',
    counterparty: 'Júlia',
    description: 'Jantar no Mocotó',
    amountCents: 11600,
    ...extra,
  });

  it('the whole transaction is the friend part: it becomes lent, with no category', async () => {
    const categoryId = await world.category('expense');
    const dinner = await world.expense(11600, '2026-11-01', {
      description: 'Mocotó',
      overrides: { category_id: categoryId, category_source: 'user' },
    });

    const bill = await world.bill(receivable({ origin: { transactionId: dinner } }));

    expect(bill.origin).toEqual({
      transactionId: dinner,
      amountCents: 11600,
      occurredOn: '2026-11-01',
      description: 'Mocotó',
    });
    expect(await world.transaction(dinner)).toMatchObject({
      nature: 'lent',
      nature_set_by: 'user',
      category_id: null,
      splits: [],
    });
  });

  it('a smaller part splits it: the part of Lucas keeps the category, the friend part is lent', async () => {
    const categoryId = await world.category('expense');
    const dinner = await world.expense(23200, '2026-11-01', {
      overrides: { category_id: categoryId, category_source: 'user' },
    });

    const bill = await world.bill(
      receivable({ origin: { transactionId: dinner, amountCents: 11600 } }),
    );

    expect(bill.origin?.amountCents).toBe(11600);
    const row = await world.transaction(dinner);
    expect(row).toMatchObject({ nature: 'expense', category_id: null });
    expect(row.splits.map((part) => [part.amount_cents, part.nature, part.category_id])).toEqual([
      [-11600, 'expense', categoryId],
      [-11600, 'lent', null],
    ]);
  });

  it('the whole origin keeps its value: editing it is 422, and the bill and the part stay', async () => {
    const dinner = await world.expense(5000, '2026-11-01');
    const bill = await world.bill(
      receivable({ amountCents: 5000, origin: { transactionId: dinner } }),
    );

    const response = await world.send('PATCH', `/transactions/${dinner}`, { amountCents: 3000 });

    await expectError(response, 422, 'TRANSACTION_LINKED_TO_BILL');
    expect((await world.transaction(dinner)).amount_cents).toBe(-5000);
    const fresh = billDtoSchema.parse(await (await world.send('GET', `/bills/${bill.id}`)).json());
    expect(fresh.origin?.amountCents).toBe(5000);
    // Other edits stay open, and the value is free again once the debt is gone.
    expect((await world.send('PATCH', `/transactions/${dinner}`, { editNote: 'x' })).status).toBe(
      200,
    );
    await world.send('DELETE', `/bills/${bill.id}`);
    expect(
      (await world.send('PATCH', `/transactions/${dinner}`, { amountCents: 3000 })).status,
    ).toBe(200);
  });

  it('shows the link of the origin in the transaction', async () => {
    const dinner = await world.expense(11600, '2026-11-01');
    const bill = await world.bill(receivable({ origin: { transactionId: dinner } }));

    const response = await world.send('GET', `/transactions/${dinner}`);

    expect(((await response.json()) as { links: { bill: unknown } }).links.bill).toEqual({
      billId: bill.id,
      description: 'Jantar no Mocotó',
      counterparty: 'Júlia',
      role: 'origin',
      amountCents: 11600,
    });
  });

  it('422 for an origin that is not a whole debit of nature expense that counts', async () => {
    const pix = await world.income(5000, '2026-11-01');
    const ignored = await world.expense(5000, '2026-11-01', {
      overrides: { ignored_at: '2026-11-02T00:00:00.000Z' },
    });
    const dinner = await world.expense(8000, '2026-11-01');
    await world.bill(receivable({ origin: { transactionId: dinner, amountCents: 3000 } }));
    const alreadySplit = dinner;

    for (const transactionId of [pix, ignored]) {
      await expectError(
        await world.send('POST', '/bills', receivable({ origin: { transactionId } })),
        422,
        'BILL_ORIGIN_TRANSACTION_INVALID',
      );
    }
    // Used as the origin of another bill it is a 409, not a 422 (checked before the rules).
    await expectError(
      await world.send('POST', '/bills', receivable({ origin: { transactionId: alreadySplit } })),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('422 when the part passes the transaction, the bill, or the default (whole) passes the bill', async () => {
    const dinner = await world.expense(8000, '2026-11-01');

    await expectError(
      await world.send(
        'POST',
        '/bills',
        receivable({ amountCents: 20000, origin: { transactionId: dinner, amountCents: 8001 } }),
      ),
      422,
      'BILL_ORIGIN_AMOUNT_EXCEEDS',
    );
    await expectError(
      await world.send(
        'POST',
        '/bills',
        receivable({ amountCents: 3000, origin: { transactionId: dinner, amountCents: 3001 } }),
      ),
      422,
      'BILL_ORIGIN_AMOUNT_EXCEEDS',
    );
    await expectError(
      await world.send(
        'POST',
        '/bills',
        receivable({ amountCents: 3000, origin: { transactionId: dinner } }),
      ),
      422,
      'BILL_ORIGIN_AMOUNT_EXCEEDS',
    );
    expect((await world.transaction(dinner)).nature).toBe('expense');
  });

  it('409 when the same transaction is the origin and the payment', async () => {
    const dinner = await world.expense(8000, '2026-11-01');

    await expectError(
      await world.send(
        'POST',
        '/bills',
        receivable({
          amountCents: 8000,
          origin: { transactionId: dinner },
          payment: { transactionId: dinner },
        }),
      ),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });

  it('a failed creation leaves the transaction as it was', async () => {
    const dinner = await world.expense(8000, '2026-11-01');
    const pix = await world.expense(1000, '2026-11-02');

    await world.send(
      'POST',
      '/bills',
      receivable({
        amountCents: 8000,
        origin: { transactionId: dinner },
        payment: { transactionId: pix },
      }),
    );

    expect(await world.transaction(dinner)).toMatchObject({ nature: 'expense', splits: [] });
  });
});

describe('POST /bills with the Pix already made (payment)', () => {
  it('I owe a friend: the Pix is a spending on its own day and takes the category of the bill', async () => {
    const categoryId = await world.category('expense');
    const pix = await world.expense(15000, '2026-11-03', { description: 'Pix para Rafa' });

    const bill = await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      description: 'Ingresso do show',
      amountCents: 45000,
      dueOn: '2026-10-31',
      categoryId,
      payment: { transactionId: pix },
    });

    expect(bill).toMatchObject({
      paidCents: 15000,
      remainingCents: 30000,
      status: 'overdue',
      payments: [
        {
          amountCents: 15000,
          paidOn: '2026-11-03',
          transactionId: pix,
          description: 'Pix para Rafa',
        },
      ],
    });
    expect(await world.transaction(pix)).toMatchObject({
      nature: 'expense',
      occurred_on: '2026-11-03',
      category_id: categoryId,
      category_source: 'bill',
    });
  });

  it('never replaces a category the transaction already has', async () => {
    const mine = await world.category('expense');
    const billCategory = await world.category('expense');
    const pix = await world.expense(15000, '2026-11-03', {
      overrides: { category_id: mine, category_source: 'user' },
    });

    await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      categoryId: billCategory,
      payment: { transactionId: pix },
    });

    expect(await world.transaction(pix)).toMatchObject({
      category_id: mine,
      category_source: 'user',
    });
  });

  it('they owe me: a smaller Pix is whole reimbursed and the bill is partial', async () => {
    const pix = await world.income(5800, '2026-11-04', { counterparty: 'JULIA MENDES' });

    const bill = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      description: 'Jantar no Mocotó',
      amountCents: 11600,
      payment: { transactionId: pix },
    });

    expect(bill).toMatchObject({ paidCents: 5800, remainingCents: 5800, status: 'partial' });
    expect(await world.transaction(pix)).toMatchObject({ nature: 'reimbursed', category_id: null });
  });

  it('a general bill to receive: the money stays income and takes the category', async () => {
    const categoryId = await world.category('income');
    const pix = await world.income(30000, '2026-11-04');

    const bill = await world.bill({
      direction: 'receivable',
      amountCents: 30000,
      categoryId,
      payment: { transactionId: pix },
    });

    expect(bill.status).toBe('settled');
    expect(await world.transaction(pix)).toMatchObject({
      nature: 'income',
      category_id: categoryId,
      category_source: 'bill',
    });
  });

  it('a receipt bigger than the debt of a friend, sent with the bill, splits and settles it (no 422)', async () => {
    const pix = await world.income(20000, '2026-11-04');

    const response = await world.send('POST', '/bills', {
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      description: 'Jantar no Mocotó',
      amountCents: 11600,
      payment: { transactionId: pix },
    });

    expect(response.status).toBe(201);
    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 11600,
      status: 'settled',
    });
    const row = await world.transaction(pix);
    expect(row.splits.map((part) => [part.amount_cents, part.nature])).toEqual([
      [8400, 'income'],
      [11600, 'reimbursed'],
    ]);
  });

  it('422 when the Pix is worth more than the bill', async () => {
    const pix = await world.expense(50000, '2026-11-03');

    await expectError(
      await world.send('POST', '/bills', {
        direction: 'payable',
        kind: 'general',
        description: 'x',
        amountCents: 45000,
        payment: { transactionId: pix },
      }),
      422,
      'BILL_OVERPAID',
    );
    expect((await world.transaction(pix)).category_source).toBeNull();
  });

  it('422 when the Pix goes the wrong way, or is a transfer or ignored', async () => {
    const credit = await world.income(1000, '2026-11-03');
    const transfer = await world.expense(1000, '2026-11-03', { overrides: { nature: 'transfer' } });
    const ignored = await world.expense(1000, '2026-11-03', {
      overrides: { ignored_at: '2026-11-04T00:00:00.000Z' },
    });

    for (const transactionId of [credit, transfer, ignored]) {
      await expectError(
        await world.send('POST', '/bills', {
          direction: 'payable',
          kind: 'general',
          description: 'x',
          amountCents: 5000,
          payment: { transactionId },
        }),
        422,
        'BILL_PAYMENT_TRANSACTION_INVALID',
      );
    }
  });

  it('409 when the transaction already pays another bill', async () => {
    const pix = await world.expense(1000, '2026-11-03');
    await world.bill({ payment: { transactionId: pix } });

    await expectError(
      await world.send('POST', '/bills', {
        direction: 'payable',
        kind: 'general',
        description: 'x',
        amountCents: 5000,
        payment: { transactionId: pix },
      }),
      409,
      'BILL_TRANSACTION_ALREADY_LINKED',
    );
  });
});

describe('GET /bills', () => {
  it('lists the open ones by day (no day at the end), then creation; settled ones only on request', async () => {
    const later = await world.bill({ description: 'B', dueOn: '2026-12-10' });
    const undated = await world.bill({ description: 'D' });
    const sooner = await world.bill({ description: 'A', dueOn: '2026-11-10' });
    const sameDay = await world.bill({ description: 'C', dueOn: '2026-12-10' });
    const pix = await world.expense(45000, '2026-11-02');
    const settled = await world.bill({
      description: 'Quitada',
      dueOn: '2026-11-01',
      payment: { transactionId: pix },
    });

    const open = await world.send('GET', '/bills');
    const onlySettled = await world.send('GET', '/bills?status=settled');
    const all = await world.send('GET', '/bills?status=all');

    const ids = async (response: Response) =>
      ((await response.json()) as { items: { id: string }[] }).items.map((item) => item.id);
    expect(await ids(open)).toEqual([sooner.id, later.id, sameDay.id, undated.id]);
    expect(await ids(onlySettled)).toEqual([settled.id]);
    expect(await ids(all)).toEqual([settled.id, sooner.id, later.id, sameDay.id, undated.id]);
  });

  it('filters by direction and by kind', async () => {
    const toPay = await world.bill({ description: 'Luz' });
    const toReceive = await world.bill({ direction: 'receivable', description: 'Aluguel' });
    const friend = await world.bill({ kind: 'friend', counterparty: 'Rafa' });

    const names = async (path: string) =>
      ((await (await world.send('GET', path)).json()) as { items: { id: string }[] }).items.map(
        (item) => item.id,
      );
    expect(await names('/bills?direction=receivable')).toEqual([toReceive.id]);
    expect(new Set(await names('/bills?direction=payable'))).toEqual(
      new Set([toPay.id, friend.id]),
    );
    expect(await names('/bills?kind=friend')).toEqual([friend.id]);
  });

  it('is empty with nothing; 400 for a status that does not exist', async () => {
    const empty = await world.send('GET', '/bills');
    const bad = await world.send('GET', '/bills?status=nope');

    expect(await empty.json()).toEqual({ items: [] });
    await expectError(bad, 400, 'VALIDATION_FAILED');
  });
});

describe('GET /bills/counterparties', () => {
  it('groups the friends by normalized name, showing the latest spelling, most recent first', async () => {
    await world.bill({ kind: 'friend', counterparty: 'rafa' });
    await world.bill({ kind: 'friend', counterparty: 'Júlia', direction: 'receivable' });
    await world.bill({ kind: 'friend', counterparty: 'RAFA' });
    await world.bill({ description: 'Luz', counterparty: 'Enel' });

    const response = await world.send('GET', '/bills/counterparties');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        { name: 'RAFA', openBillsCount: 2 },
        { name: 'Júlia', openBillsCount: 1 },
      ],
    });
  });

  it('counts only the ones not settled', async () => {
    const pix = await world.expense(45000, '2026-11-02');
    await world.bill({ kind: 'friend', counterparty: 'Rafa', payment: { transactionId: pix } });
    await world.bill({ kind: 'friend', counterparty: 'Rafa' });

    const response = await world.send('GET', '/bills/counterparties');

    expect(await response.json()).toEqual({ items: [{ name: 'Rafa', openBillsCount: 1 }] });
  });
});

describe('GET /bills/:id', () => {
  it('answers the detail with the payments in order of day', async () => {
    const bill = await world.bill({ amountCents: 45000 });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 2000,
      paidOn: '2026-11-05',
    });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 1000,
      paidOn: '2026-11-02',
    });

    const response = await world.send('GET', `/bills/${bill.id}`);

    expect(response.status).toBe(200);
    const body = billDtoSchema.parse(await response.json());
    expect(body.payments.map((payment) => payment.paidOn)).toEqual(['2026-11-02', '2026-11-05']);
    expect(body).toMatchObject({ paidCents: 3000, status: 'partial' });
  });

  it('404 BILL_NOT_FOUND, 400 for a bad id', async () => {
    await expectError(await world.send('GET', `/bills/${MISSING}`), 404, 'BILL_NOT_FOUND');
    await expectError(await world.send('GET', '/bills/not-an-id'), 400, 'VALIDATION_FAILED');
  });
});

describe('PATCH /bills/:id', () => {
  it('edits the fields, and null clears the day and the category', async () => {
    const categoryId = await world.category('expense');
    const bill = await world.bill({ dueOn: '2026-11-20', categoryId });

    const response = await world.send('PATCH', `/bills/${bill.id}`, {
      description: 'Luz de novembro',
      amountCents: 50000,
      dueOn: null,
      categoryId: null,
    });

    expect(response.status).toBe(200);
    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      description: 'Luz de novembro',
      amountCents: 50000,
      dueOn: null,
      categoryId: null,
    });
  });

  it('does not touch the category already put on a payment made', async () => {
    const first = await world.category('expense');
    const second = await world.category('expense');
    const pix = await world.expense(5000, '2026-11-02');
    const bill = await world.bill({ categoryId: first, payment: { transactionId: pix } });

    await world.send('PATCH', `/bills/${bill.id}`, { categoryId: second });

    expect((await world.transaction(pix)).category_id).toBe(first);
  });

  it('the value can go down to what was paid and no lower', async () => {
    const bill = await world.bill({ amountCents: 45000 });
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 15000,
      paidOn: '2026-11-02',
    });

    const exact = await world.send('PATCH', `/bills/${bill.id}`, { amountCents: 15000 });
    const below = await world.send('PATCH', `/bills/${bill.id}`, { amountCents: 14999 });

    expect(billDtoSchema.parse(await exact.json()).status).toBe('settled');
    await expectError(below, 422, 'BILL_AMOUNT_BELOW_PAID');
  });

  it('the paid amount follows a transaction that was ignored', async () => {
    const pix = await world.expense(15000, '2026-11-02');
    const bill = await world.bill({ amountCents: 45000, payment: { transactionId: pix } });
    await world.db
      .updateTable('transactions')
      .set({ ignored_at: '2026-11-03T00:00:00.000Z' })
      .where('id', '=', pix)
      .execute();

    const response = await world.send('PATCH', `/bills/${bill.id}`, { amountCents: 20000 });

    expect(billDtoSchema.parse(await response.json())).toMatchObject({
      paidCents: 0,
      payments: [],
      status: 'open',
    });
  });

  it('422 for a category of the wrong kind or on a reimbursement; 404 for the bill and the category', async () => {
    const bill = await world.bill({});
    const reimbursement = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
    });
    const income = await world.category('income');

    await expectError(
      await world.send('PATCH', `/bills/${bill.id}`, { categoryId: income }),
      422,
      'BILL_CATEGORY_KIND_MISMATCH',
    );
    await expectError(
      await world.send('PATCH', `/bills/${reimbursement.id}`, { categoryId: income }),
      422,
      'BILL_CATEGORY_KIND_MISMATCH',
    );
    await expectError(
      await world.send('PATCH', `/bills/${bill.id}`, { categoryId: MISSING }),
      404,
      'CATEGORY_NOT_FOUND',
    );
    await expectError(
      await world.send('PATCH', `/bills/${MISSING}`, { description: 'x' }),
      404,
      'BILL_NOT_FOUND',
    );
  });

  it('400 for an empty body, a field that cannot change and a null person', async () => {
    const bill = await world.bill({});

    await expectError(await world.send('PATCH', `/bills/${bill.id}`, {}), 400, 'VALIDATION_FAILED');
    await expectError(
      await world.send('PATCH', `/bills/${bill.id}`, { direction: 'receivable' }),
      400,
      'VALIDATION_FAILED',
    );
    await expectError(
      await world.send('PATCH', `/bills/${bill.id}`, { counterparty: null }),
      400,
      'VALIDATION_FAILED',
    );
  });
});

describe('DELETE /bills/:id', () => {
  it('deletes the bill and its payments: 204, then 404', async () => {
    const bill = await world.bill({});
    await world.send('POST', `/bills/${bill.id}/payments`, {
      amountCents: 1000,
      paidOn: '2026-11-02',
    });

    const response = await world.send('DELETE', `/bills/${bill.id}`);

    expect(response.status).toBe(204);
    await expectError(await world.send('GET', `/bills/${bill.id}`), 404, 'BILL_NOT_FOUND');
    expect(await world.db.selectFrom('bill_payments').selectAll().execute()).toEqual([]);
  });

  it('gives back the origin in full: expense again, without the category it lost', async () => {
    const dinner = await world.expense(11600, '2026-11-01');
    const bill = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      amountCents: 11600,
      origin: { transactionId: dinner },
    });

    await world.send('DELETE', `/bills/${bill.id}`);

    expect(await world.transaction(dinner)).toMatchObject({
      nature: 'expense',
      nature_set_by: 'system',
      category_id: null,
    });
  });

  it('gives back a split origin: whole again, with the category of the part of Lucas', async () => {
    const categoryId = await world.category('expense');
    const dinner = await world.expense(23200, '2026-11-01', {
      overrides: { category_id: categoryId, category_source: 'user' },
    });
    const bill = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      amountCents: 11600,
      origin: { transactionId: dinner, amountCents: 11600 },
    });

    await world.send('DELETE', `/bills/${bill.id}`);

    expect(await world.transaction(dinner)).toMatchObject({
      nature: 'expense',
      category_id: categoryId,
      splits: [],
    });
  });

  it('gives back the money that came back (income) and the category that the bill put', async () => {
    const pix = await world.income(5800, '2026-11-04');
    const reimbursement = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      amountCents: 11600,
      payment: { transactionId: pix },
    });
    const categoryId = await world.category('expense');
    const owed = await world.expense(15000, '2026-11-03');
    const debt = await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      categoryId,
      payment: { transactionId: owed },
    });

    await world.send('DELETE', `/bills/${reimbursement.id}`);
    await world.send('DELETE', `/bills/${debt.id}`);

    expect(await world.transaction(pix)).toMatchObject({
      nature: 'income',
      nature_set_by: 'system',
    });
    expect(await world.transaction(owed)).toMatchObject({
      nature: 'expense',
      category_id: null,
      category_source: null,
    });
  });

  it('keeps a category that Lucas chose after the bill put its own', async () => {
    const billCategory = await world.category('expense');
    const mine = await world.category('expense');
    const owed = await world.expense(15000, '2026-11-03');
    const debt = await world.bill({
      kind: 'friend',
      counterparty: 'Rafa',
      categoryId: billCategory,
      payment: { transactionId: owed },
    });
    await world.db
      .updateTable('transactions')
      .set({ category_id: mine, category_source: 'user' })
      .where('id', '=', owed)
      .execute();

    await world.send('DELETE', `/bills/${debt.id}`);

    expect((await world.transaction(owed)).category_id).toBe(mine);
  });

  it('404 BILL_NOT_FOUND', async () => {
    await expectError(await world.send('DELETE', `/bills/${MISSING}`), 404, 'BILL_NOT_FOUND');
  });
});

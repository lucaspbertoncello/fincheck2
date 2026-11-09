import {
  billDtoSchema,
  billPaymentCandidateDtoSchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function addTransaction(
  input: Partial<Parameters<typeof makeTransactionRecord>[0]> & { amountCents: number },
): MockState.TransactionRecord {
  const accountId = db.accounts.find((account) => account.type === 'checking')?.id ?? '';
  const tx = makeTransactionRecord({
    accountId,
    method: 'pix',
    description: 'PIX TESTE',
    occurredOn: addDays(TODAY, -2),
    ...input,
  });
  db.transactions.push(tx);

  return tx;
}

async function createBill(body: Record<string, unknown>) {
  const answer = await callApi('POST', '/bills', {
    kind: 'general',
    description: 'Conta de teste',
    ...body,
  });

  return {
    status: answer.status,
    bill: answer.status === 201 ? billDtoSchema.parse(answer.json) : null,
  };
}

async function readBill(id: string) {
  return billDtoSchema.parse((await callApi('GET', `/bills/${id}`)).json);
}

describe('bills mock, aligned with the API (paid amount)', () => {
  it('drops a payment whose transaction is ignored and brings it back with the transaction', async () => {
    const tx = addTransaction({ amountCents: -5000 });
    const { bill } = await createBill({ direction: 'payable', amountCents: 5000 });
    await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: tx.id });
    expect((await readBill(bill?.id ?? '')).payments).toHaveLength(1);

    tx.ignoredAt = '2026-01-01T00:00:00.000Z';
    expect(await readBill(bill?.id ?? '')).toMatchObject({ paidCents: 0, payments: [] });
    tx.ignoredAt = null;
    expect((await readBill(bill?.id ?? '')).paidCents).toBe(5000);
  });

  it('counts a transaction that became a transfer as zero', async () => {
    const tx = addTransaction({ amountCents: -5000 });
    const { bill } = await createBill({ direction: 'payable', amountCents: 5000 });
    await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: tx.id });
    tx.nature = 'transfer';

    expect(await readBill(bill?.id ?? '')).toMatchObject({ paidCents: 0, payments: [] });
  });

  it('orders the payments by day and cuts each to what the bill still misses', async () => {
    const tx = addTransaction({ amountCents: -8000 });
    const { bill } = await createBill({ direction: 'payable', amountCents: 10_000 });
    const id = bill?.id ?? '';
    await callApi('POST', `/bills/${id}/payments`, {
      transactionId: tx.id,
      paidOn: '2026-01-10',
    });
    tx.ignoredAt = '2026-01-11T00:00:00.000Z';
    await callApi('POST', `/bills/${id}/payments`, { amountCents: 2000, paidOn: '2026-01-20' });
    await callApi('POST', `/bills/${id}/payments`, { amountCents: 8000, paidOn: '2026-01-25' });
    expect((await readBill(id)).paidCents).toBe(10_000);

    // The ignored transaction counts again: it comes first (earlier day), the last hand-made payment
    // is cut to nothing and leaves `payments`.
    tx.ignoredAt = null;
    const after = await readBill(id);
    expect(after.paidCents).toBe(10_000);
    expect(after.payments.map((payment) => [payment.paidOn, payment.amountCents])).toEqual([
      ['2026-01-10', 8000],
      ['2026-01-20', 2000],
    ]);
  });
});

describe('bills mock, aligned with the API (linking a transaction)', () => {
  it('answers 409 for a transaction already linked, before the 422 of the wrong kind', async () => {
    const tx = addTransaction({ amountCents: -5000 });
    const first = await createBill({ direction: 'payable', amountCents: 5000 });
    await callApi('POST', `/bills/${first.bill?.id}/payments`, { transactionId: tx.id });
    const second = await createBill({ direction: 'receivable', amountCents: 5000 });

    // The transaction is a debit (wrong way for a receivable) and linked: the 409 comes first.
    const linked = await callApi('POST', `/bills/${second.bill?.id}/payments`, {
      transactionId: tx.id,
    });
    expect(linked.status).toBe(409);
    expect(
      (await callApi('POST', `/bills/${second.bill?.id}/payments`, { transactionId: 'x' })).status,
    ).toBe(400);
    expect(
      (
        await callApi('POST', `/bills/${second.bill?.id}/payments`, {
          transactionId: '0194f3a0-0000-7000-8000-999999999999',
        })
      ).status,
    ).toBe(404);
  });

  it('uses the paidOn of the body, or the day of the transaction', async () => {
    const tx = addTransaction({ amountCents: -3000, occurredOn: addDays(TODAY, -4) });
    const other = addTransaction({ amountCents: -3000, occurredOn: addDays(TODAY, -3) });
    const { bill } = await createBill({ direction: 'payable', amountCents: 6000 });
    await callApi('POST', `/bills/${bill?.id}/payments`, {
      transactionId: tx.id,
      paidOn: '2026-02-02',
    });
    await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: other.id });

    const days = (await readBill(bill?.id ?? '')).payments.map((payment) => payment.paidOn);
    expect(days).toEqual(['2026-02-02', addDays(TODAY, -3)].sort());
  });

  it('does not accept a split transaction as payment', async () => {
    const tx = addTransaction({ amountCents: -3000 });
    tx.splits = [
      {
        id: 'a',
        position: 1,
        amountCents: -1000,
        nature: 'expense',
        categoryId: null,
        description: null,
      },
      {
        id: 'b',
        position: 2,
        amountCents: -2000,
        nature: 'expense',
        categoryId: null,
        description: null,
      },
    ];
    const { bill } = await createBill({ direction: 'payable', amountCents: 3000 });

    expect(
      (await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: tx.id })).status,
    ).toBe(422);
  });
});

describe('bills mock, aligned with the API (what an incoming Pix becomes)', () => {
  it('splits an entry bigger than the amount of the payment (the payment is the reimbursement)', async () => {
    const tx = addTransaction({ amountCents: 10_000 });
    const { bill } = await createBill({
      kind: 'friend',
      counterparty: 'Rafa',
      direction: 'receivable',
      amountCents: 11_600,
    });
    await callApi('POST', `/bills/${bill?.id}/payments`, {
      transactionId: tx.id,
      amountCents: 4000,
    });

    expect(tx.splits.map((part) => [part.nature, part.amountCents])).toEqual([
      ['reimbursed', 4000],
      ['income', 6000],
    ]);
    expect((await readBill(bill?.id ?? '')).paidCents).toBe(4000);
  });

  it('without an amount takes min(entry, what is missing) in a debt owed to me', async () => {
    const tx = addTransaction({ amountCents: 20_000 });
    const { bill } = await createBill({
      kind: 'friend',
      counterparty: 'Rafa',
      direction: 'receivable',
      amountCents: 11_600,
    });
    const answer = await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: tx.id });

    expect(answer.status).toBe(201);
    expect(tx.splits.map((part) => [part.nature, part.amountCents])).toEqual([
      ['reimbursed', 11_600],
      ['income', 8400],
    ]);
    expect(billDtoSchema.parse(answer.json)).toMatchObject({
      status: 'settled',
      paidCents: 11_600,
    });
  });

  it('keeps BILL_OVERPAID for a general bill and writes nothing', async () => {
    const tx = addTransaction({ amountCents: -5000 });
    const category = db.categories.find((item) => item.kind === 'expense' && !item.archivedAt);
    const { bill } = await createBill({
      direction: 'payable',
      amountCents: 1000,
      categoryId: category?.id,
    });

    const answer = await callApi('POST', `/bills/${bill?.id}/payments`, { transactionId: tx.id });
    expect(answer.status).toBe(422);
    expect((answer.json as { code: string }).code).toBe('BILL_OVERPAID');
    expect(tx.categoryId).toBeNull();
    expect(db.bills.find((item) => item.id === bill?.id)?.payments).toEqual([]);
  });

  it('writes nothing on POST /bills when the payment is refused', async () => {
    const tx = addTransaction({ amountCents: -5000 });
    const before = db.bills.length;

    const { status } = await createBill({
      direction: 'payable',
      amountCents: 1000,
      payment: { transactionId: tx.id },
    });

    expect(status).toBe(422);
    expect(db.bills).toHaveLength(before);
    expect(tx.categoryId).toBeNull();
  });

  it('gives the origin back to the system when the bill is deleted', async () => {
    const origin = addTransaction({ amountCents: -9000, description: 'JANTAR' });
    const { bill } = await createBill({
      kind: 'friend',
      counterparty: 'Júlia',
      direction: 'receivable',
      amountCents: 9000,
      origin: { transactionId: origin.id },
    });
    expect(origin).toMatchObject({ nature: 'lent', natureSetBy: 'user' });

    await callApi('DELETE', `/bills/${bill?.id}`);
    expect(origin).toMatchObject({ nature: 'expense', natureSetBy: 'system' });
  });
});

describe('bills mock, aligned with the API (candidates)', () => {
  async function candidates(query: string) {
    return listResponseSchema(billPaymentCandidateDtoSchema).parse(
      (await callApi('GET', `/bills/payment-candidates?${query}`)).json,
    ).items;
  }

  it('leaves out card purchases, split and future transactions', async () => {
    const card = addTransaction({ amountCents: -1111, method: 'credit' });
    const split = addTransaction({ amountCents: -2222 });
    split.splits = [
      {
        id: 'a',
        position: 1,
        amountCents: -1000,
        nature: 'expense',
        categoryId: null,
        description: null,
      },
      {
        id: 'b',
        position: 2,
        amountCents: -1222,
        nature: 'expense',
        categoryId: null,
        description: null,
      },
    ];
    const future = addTransaction({ amountCents: -3333, occurredOn: addDays(TODAY, 3) });
    const fine = addTransaction({ amountCents: -4444 });

    const ids = (await candidates('direction=payable')).map((item) => item.transactionId);
    expect(ids).toContain(fine.id);
    expect(ids).not.toContain(card.id);
    expect(ids).not.toContain(split.id);
    expect(ids).not.toContain(future.id);
  });

  it('leaves out the ones dismissed for that bill', async () => {
    const tx = addTransaction({ amountCents: -4444 });
    const { bill } = await createBill({ direction: 'payable', amountCents: 4444 });
    const listFor = async () =>
      listResponseSchema(billPaymentCandidateDtoSchema)
        .parse((await callApi('GET', `/bills/${bill?.id}/payment-candidates`)).json)
        .items.map((item) => item.transactionId);
    expect(await listFor()).toContain(tx.id);

    await callApi('POST', `/bills/${bill?.id}/payment-suggestion/dismiss`, {
      transactionId: tx.id,
    });
    expect(await listFor()).not.toContain(tx.id);
  });

  it('matches the name as whole words: Ana is in "PIX ANA SILVA", not in "BANANA"', async () => {
    const banana = addTransaction({
      amountCents: -1000,
      description: 'COMPRA BANANA',
      occurredOn: addDays(TODAY, -1),
    });
    const ana = addTransaction({
      amountCents: -1000,
      description: 'PIX ANA SILVA',
      occurredOn: addDays(TODAY, -5),
    });

    const ids = (await candidates('direction=payable&counterparty=Ana')).map(
      (item) => item.transactionId,
    );
    expect(ids.indexOf(ana.id)).toBeLessThan(ids.indexOf(banana.id));
  });
});

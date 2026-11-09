import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
  openInvoiceItemSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const MISSING = '0194f3a0-0000-7000-8000-999999999999';
const OTHER_ID = '0194f3a0-0000-7000-8000-999999999998';

async function openInvoices() {
  return listResponseSchema(openInvoiceItemSchema).parse(
    (await callApi('GET', '/invoices/open')).json,
  ).items;
}

async function closedInvoice() {
  const closed = (await openInvoices()).find((item) => item.invoice.status === 'closed');
  if (!closed?.invoice.paymentSuggestion) throw new Error('The seed has no closed invoice');
  const base = `/cards/${closed.accountId}/invoices/${closed.invoice.month}`;
  const candidate = db.transactions.find(
    (tx) => tx.id === closed.invoice.paymentSuggestion?.transactionId,
  );
  if (!candidate) throw new Error('No candidate');

  return { closed, base, candidate };
}

async function openNubank() {
  const nubank = (await openInvoices()).find((item) => item.invoice.status === 'open');
  if (!nubank) throw new Error('No open invoice');

  return { accountId: nubank.accountId, month: nubank.invoice.month };
}

function purchase(
  accountId: string,
  month: string,
  amountCents: number,
  overrides: Partial<MockState.TransactionRecord> = {},
): MockState.TransactionRecord {
  const tx = makeTransactionRecord({
    accountId,
    method: 'credit',
    description: 'COMPRA TESTE',
    amountCents: -amountCents,
    occurredOn: `${month}-03`,
    invoiceMonth: month,
  });
  Object.assign(tx, overrides);
  db.transactions.push(tx);

  return tx;
}

async function readDetail(accountId: string, month: string) {
  return invoiceDetailDtoSchema.parse(
    (await callApi('GET', `/cards/${accountId}/invoices/${month}`)).json,
  );
}

describe('invoices routes (aligned with the api)', () => {
  it('refuses a month outside 2000 to 2100 and a range that was not whole (57)', async () => {
    const { accountId } = await openNubank();
    const base = `/cards/${accountId}/invoices`;

    expect((await callApi('GET', `${base}/1999-12`)).status).toBe(400);
    expect((await callApi('GET', `${base}/2101-01`)).status).toBe(400);
    expect((await callApi('GET', `${base}?from=1999-12&to=2000-01`)).status).toBe(400);
    expect((await callApi('GET', `${base}?from=2000-01`)).status).toBe(400);
    expect((await callApi('GET', `${base}?to=2026-01`)).status).toBe(400);
    expect((await callApi('GET', `${base}?from=2026-01&to=2026-01`)).status).toBe(200);
    expect((await callApi('PATCH', `${base}/2101-01`, { totalOverrideCents: 100 })).status).toBe(
      400,
    );
  });

  it('answers 404 to the undo of a payment in a month with no row, and creates no row (53)', async () => {
    const { accountId } = await openNubank();
    const before = db.invoices.length;
    const answer = await callApi(
      'DELETE',
      `/cards/${accountId}/invoices/2026-03/payments/${MISSING}`,
    );

    expect(answer.status).toBe(404);
    expect(answer.json).toMatchObject({ code: 'INVOICE_PAYMENT_NOT_FOUND' });
    expect(db.invoices).toHaveLength(before);
  });

  it('looks for the transaction before it says the invoice is not payable (52)', async () => {
    const { accountId } = await openNubank();
    const projected = `/cards/${accountId}/invoices/2027-06/payments`;
    const body = { amountCents: 100, paidOn: '2026-10-22' };

    const unknown = await callApi('POST', projected, { ...body, transactionId: MISSING });
    expect(unknown.status).toBe(404);
    expect(unknown.json).toMatchObject({ code: 'TRANSACTION_NOT_FOUND' });
    const noTransaction = await callApi('POST', projected, body);
    expect(noTransaction.json).toMatchObject({ code: 'INVOICE_NOT_PAYABLE' });
  });

  it('refuses as a payment what is split, ignored, removed by the bank, or has another role (48)', async () => {
    const { closed, base } = await closedInvoice();
    const other = db.accounts.find((item) => item.type !== 'credit_card' && !item.archivedAt);
    if (!other) throw new Error('No account');
    const outgoing = (overrides: Partial<MockState.TransactionRecord>) => {
      const tx = makeTransactionRecord({
        accountId: other.id,
        method: 'pix',
        description: 'SAIDA',
        amountCents: -1000,
        occurredOn: closed.invoice.closesOn,
      });
      Object.assign(tx, overrides);
      db.transactions.push(tx);

      return tx;
    };
    const attempts = [
      outgoing({ nature: 'transfer' }),
      outgoing({ nature: 'lent' }),
      outgoing({ nature: 'balance_adjustment' }),
      outgoing({
        splits: [
          {
            id: MISSING,
            position: 1,
            amountCents: -1000,
            nature: 'expense',
            categoryId: null,
            description: null,
          },
        ],
      }),
      outgoing({ removedByBankAt: '2026-10-01T12:00:00.000Z' }),
      outgoing({ ignoredAt: '2026-10-01T12:00:00.000Z' }),
    ];

    for (const tx of attempts) {
      const answer = await callApi('POST', `${base}/payments`, {
        amountCents: 1000,
        paidOn: closed.invoice.closesOn,
        transactionId: tx.id,
      });
      expect(answer.status).toBe(422);
      expect(answer.json).toMatchObject({ code: 'INVOICE_PAYMENT_TRANSACTION_INVALID' });
    }
  });

  it('keeps who marked a transaction that was already a payment (46)', async () => {
    const { closed, base, candidate } = await closedInvoice();
    expect(candidate).toMatchObject({ nature: 'invoice_payment', natureSetBy: 'system' });

    const linked = await callApi('POST', `${base}/payments`, {
      amountCents: Math.abs(candidate.amountCents),
      paidOn: closed.invoice.closesOn,
      transactionId: candidate.id,
    });
    expect(linked.status).toBe(201);
    expect(candidate).toMatchObject({ nature: 'invoice_payment', natureSetBy: 'system' });

    // Undoing it only makes it a suggestion again.
    const paymentId = invoiceDtoSchema.parse(linked.json).payments[0]?.id;
    expect((await callApi('DELETE', `${base}/payments/${paymentId}`)).status).toBe(204);
    expect(candidate).toMatchObject({ nature: 'invoice_payment', natureSetBy: 'system' });
  });

  it('counts the whole value of the payment found as presumed paid, and what is left stops at zero (44)', async () => {
    const { closed, base, candidate } = await closedInvoice();
    candidate.amountCents = -(closed.invoice.totalCents + 80);

    const invoice = invoiceDtoSchema.parse((await callApi('GET', base)).json);
    expect(invoice.paymentSuggestion?.isPresumed).toBe(true);
    expect(invoice.presumedPaidCents).toBe(closed.invoice.totalCents + 80);
    expect(invoice.remainingCents).toBe(0);
  });

  it('presumes a payment with a mirror credit on the card, even far from the amount (43)', async () => {
    const { closed, base, candidate } = await closedInvoice();
    const total = closed.invoice.totalCents;
    // Far from what is lacking and with no mirror: not a candidate at all.
    candidate.amountCents = -(total + 50_000);
    expect(invoiceDtoSchema.parse((await callApi('GET', base)).json).paymentSuggestion).toBeNull();

    // With a credit of the same value on the card, on the same day, it is found and presumed.
    candidate.occurredOn = closed.invoice.closesOn;
    db.transactions.push(
      makeTransactionRecord({
        accountId: closed.accountId,
        method: 'credit',
        description: 'PAGAMENTO RECEBIDO',
        amountCents: total + 50_001,
        occurredOn: closed.invoice.closesOn,
        nature: 'invoice_payment',
      }),
    );
    const withMirror = invoiceDtoSchema.parse((await callApi('GET', base)).json);
    expect(withMirror.paymentSuggestion).toMatchObject({
      transactionId: candidate.id,
      isPresumed: true,
    });

    // A second candidate near the amount, and none of them alone: the one nearest wins, and the
    // one with a mirror stays presumed on its own.
    db.transactions.push(
      makeTransactionRecord({
        accountId: candidate.accountId,
        method: 'pix',
        description: 'OUTRO',
        amountCents: -total,
        occurredOn: closed.invoice.closesOn,
        nature: 'invoice_payment',
      }),
    );
    const both = invoiceDtoSchema.parse((await callApi('GET', base)).json);
    expect(both.paymentSuggestion?.transactionId).not.toBe(candidate.id);
    expect(both.paymentSuggestion?.isPresumed).toBe(false);
  });

  it('keeps the payments of the same day in the order they were made (45)', async () => {
    const { accountId, month } = await openNubank();
    const base = `/cards/${accountId}/invoices/${month}/payments`;
    for (const amountCents of [300, 100, 200]) {
      await callApi('POST', base, { amountCents, paidOn: '2026-10-10' });
    }
    await callApi('POST', base, { amountCents: 50, paidOn: '2026-10-05' });

    const invoice = invoiceDtoSchema.parse(
      (await callApi('GET', `/cards/${accountId}/invoices/${month}`)).json,
    );
    expect(invoice.payments.map((payment) => payment.amountCents)).toEqual([50, 300, 100, 200]);
  });

  it('breaks a tie of the same day by the biggest id, and of the biggest purchase by the most recent (51, 50)', async () => {
    const { accountId, month } = await openNubank();
    const huge = 9_000_000;
    purchase(accountId, month, huge, { description: 'GRANDE A', occurredOn: `${month}-02` });
    const newer = purchase(accountId, month, huge, {
      description: 'GRANDE B',
      occurredOn: `${month}-04`,
    });
    const first = purchase(accountId, month, 777, { occurredOn: `${month}-05` });
    const second = purchase(accountId, month, 777, { occurredOn: `${month}-05` });

    const detail = await readDetail(accountId, month);
    expect(detail.highlights.largestItem?.transactionId).toBe(newer.id);
    const sameDay = detail.items.flatMap((item) =>
      item.type === 'transaction' && item.occurredOn === `${month}-05` ? [item.transactionId] : [],
    );
    expect(sameDay).toEqual([first.id, second.id].sort().reverse());
  });

  it('orders the endings by the biggest value first (50)', async () => {
    const { accountId, month } = await openNubank();
    const last = (amount: number, description: string) =>
      purchase(accountId, month, amount, {
        description,
        installment: { planId: MISSING, number: 3, count: 3 },
      });
    last(10_000, 'PARCELA PEQUENA');
    last(80_000, 'PARCELA GRANDE');

    const titles = (await readDetail(accountId, month)).highlights.endingInstallments.map(
      (item) => item.title,
    );
    expect(titles.indexOf('PARCELA GRANDE')).toBeLessThan(titles.indexOf('PARCELA PEQUENA'));
  });

  it('counts a split purchase by its parts, gives what was lent its own line and leaves out transfers and adjustments (42, 49, 55)', async () => {
    const { accountId, month } = await openNubank();
    const before = await readDetail(accountId, month);
    const category = db.categories.find((item) => item.kind === 'expense');
    if (!category) throw new Error('No category');
    const pool = 7_000_000;
    purchase(accountId, month, pool, {
      description: 'DIVIDIDA',
      categoryId: null,
      splits: [
        {
          id: MISSING,
          position: 1,
          amountCents: -(pool - 2_000_000),
          nature: 'expense',
          categoryId: category.id,
          description: null,
        },
        {
          id: OTHER_ID,
          position: 2,
          amountCents: -2_000_000,
          nature: 'lent',
          categoryId: null,
          description: null,
        },
      ],
    });
    purchase(accountId, month, 5_000_000, { description: 'MOVIDA', nature: 'transfer' });
    purchase(accountId, month, 4_000_000, { description: 'AJUSTE', nature: 'balance_adjustment' });
    purchase(accountId, month, 100, { description: 'EMPRESTADO', nature: 'lent' });

    const detail = await readDetail(accountId, month);
    const lent = detail.categoryBreakdown.filter((row) => row.isLent);
    // The part of the split and the whole transaction that was lent: one line, with no category.
    expect(lent).toEqual([
      expect.objectContaining({
        categoryId: null,
        isLent: true,
        totalCents: 2_000_100,
        itemCount: 2,
      }),
    ]);
    const share = (rows: typeof detail.categoryBreakdown) =>
      rows.find((row) => row.categoryId === category.id && !row.isLent)?.totalCents ?? 0;
    expect(share(detail.categoryBreakdown)).toBe(
      share(before.categoryBreakdown) + pool - 2_000_000,
    );
    // The transfer and the adjustment are not spending; the split item itself has no category.
    const sum = (rows: typeof detail.categoryBreakdown) =>
      rows.reduce((total, row) => total + row.totalCents, 0);
    expect(sum(detail.categoryBreakdown)).toBe(sum(before.categoryBreakdown) + pool + 100);
    expect(
      detail.items.find((item) => item.type === 'transaction' && item.description === 'DIVIDIDA'),
    ).toMatchObject({ categoryId: null });
  });
});

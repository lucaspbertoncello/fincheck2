import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
  openInvoiceItemSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { describe, expect, it } from 'vitest';

import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function openInvoices() {
  return listResponseSchema(openInvoiceItemSchema).parse(
    (await callApi('GET', '/invoices/open')).json,
  ).items;
}

describe('invoices routes', () => {
  it('shows one invoice per card: the Nubank one open and the Bradesco one closed with a payment found', async () => {
    const items = await openInvoices();
    expect(items).toHaveLength(2);
    const accounts = listResponseSchema(accountDtoSchema).parse(
      (await callApi('GET', '/accounts')).json,
    ).items;
    const byName = (name: string) =>
      items.find((item) => item.accountId === accounts.find((account) => account.name === name)?.id)
        ?.invoice;

    const nubank = byName('Roxinho');
    expect(nubank?.status).toBe('open');
    // The notebook (3 of 10), the fridge (10 of 10), the course (6 of 6) and the chair (4 of 5).
    expect(nubank?.breakdown.installmentsCents).toBe(34_900 + 28_990 + 19_900 + 21_990);
    // Plano celular (54,99) and Nuvem+ (19,90), the subscription that did not charge yet.
    expect(nubank?.breakdown.expectedRecurringCents).toBe(5499 + 1990);
    expect(nubank?.totalCents).toBe(nubank?.computedTotalCents);

    const bradesco = byName('Bradesco Black');
    expect(bradesco?.status).toBe('closed');
    expect(bradesco?.paymentSuggestion?.isPresumed).toBe(true);
    expect(bradesco?.presumedPaidCents).toBe(bradesco?.totalCents);
    expect(bradesco?.remainingCents).toBe(0);
  });

  it('lists every month of a range, reads the detail and refuses an unknown card', async () => {
    const [first] = await openInvoices();
    const id = first?.accountId ?? '';
    const range = listResponseSchema(invoiceDtoSchema).parse(
      (await callApi('GET', `/cards/${id}/invoices`)).json,
    ).items;
    expect(range.length).toBeGreaterThanOrEqual(6);
    expect(range.at(-1)?.status).toBe('projected');
    expect(range.map((item) => item.month)).toEqual([...range.map((item) => item.month)].sort());

    const detail = invoiceDetailDtoSchema.parse(
      (await callApi('GET', `/cards/${id}/invoices/${first?.invoice.month}`)).json,
    );
    expect(detail.items.length).toBeGreaterThan(0);
    expect((await callApi('GET', `/cards/${id}/invoices?from=2026-12&to=2026-01`)).status).toBe(
      400,
    );
    expect(
      (await callApi('GET', '/cards/0194f3a0-0000-7000-8000-999999999999/invoices')).status,
    ).toBe(404);
  });

  it('gives the detail the composition by category, the previous total, the highlights and what the next invoice has', async () => {
    const [first] = await openInvoices();
    const nubank = (await openInvoices()).find((item) => item.invoice.status === 'open');
    const id = nubank?.accountId ?? first?.accountId ?? '';
    const month = nubank?.invoice.month ?? '';
    const detail = invoiceDetailDtoSchema.parse(
      (await callApi('GET', `/cards/${id}/invoices/${month}`)).json,
    );

    const transactions = detail.items.filter((item) => item.type === 'transaction');
    expect(transactions.length).toBeGreaterThanOrEqual(30);
    // Refunds take off: the breakdown plus the expected recurrences is the invoice total.
    const breakdownTotal = detail.categoryBreakdown.reduce((sum, row) => sum + row.totalCents, 0);
    const itemsTotal = transactions.reduce((sum, item) => sum - item.amountCents, 0);
    expect(breakdownTotal).toBe(itemsTotal);
    expect(detail.categoryBreakdown.map((row) => row.totalCents)).toEqual(
      [...detail.categoryBreakdown.map((row) => row.totalCents)].sort((a, b) => b - a),
    );
    const shares = detail.categoryBreakdown.reduce((sum, row) => sum + row.sharePercent, 0);
    expect(shares).toBeGreaterThan(99);
    expect(shares).toBeLessThan(101);

    expect(detail.previousTotalCents).not.toBeNull();
    expect(detail.highlights.largestItem?.cents).toBe(
      Math.max(...transactions.map((item) => -item.amountCents)),
    );
    expect(detail.highlights.endingInstallments.map((item) => item.title).sort()).toEqual([
      'Curso de inglês',
      'Geladeira Frost Free',
    ]);
    // The next invoice already has the chair (5 of 5) and the card subscriptions.
    expect(detail.nextInvoiceCommittedCents).toBeGreaterThanOrEqual(21_990);
  });

  it('says there is no previous invoice before the first one', async () => {
    const [first] = await openInvoices();
    const detail = invoiceDetailDtoSchema.parse(
      (await callApi('GET', `/cards/${first?.accountId}/invoices/2020-01`)).json,
    );
    expect(detail.previousTotalCents).toBeNull();
    expect(detail.categoryBreakdown).toEqual([]);
    expect(detail.highlights).toEqual({ largestItem: null, endingInstallments: [] });
  });

  it('corrects the value, pays in part and in full, then undoes the payment', async () => {
    const [first] = await openInvoices();
    const base = `/cards/${first?.accountId}/invoices/${first?.invoice.month}`;
    const corrected = invoiceDtoSchema.parse(
      (await callApi('PATCH', base, { totalOverrideCents: 100_000, overrideNote: 'O banco errou' }))
        .json,
    );
    expect(corrected.totalCents).toBe(100_000);

    const partial = await callApi('POST', `${base}/payments`, {
      amountCents: 40_000,
      paidOn: '2026-01-10',
    });
    expect(partial.status).toBe(201);
    const afterPartial = invoiceDtoSchema.parse(partial.json);
    expect(afterPartial).toMatchObject({ paidCents: 40_000, remainingCents: 60_000 });
    expect(afterPartial.payments).toHaveLength(1);

    const full = invoiceDtoSchema.parse(
      (await callApi('POST', `${base}/payments`, { amountCents: 60_000, paidOn: '2026-01-11' }))
        .json,
    );
    expect(full.status).toBe('paid');
    expect(
      (await callApi('DELETE', `${base}/payments/${afterPartial.payments[0]?.id}`)).status,
    ).toBe(204);
    expect(invoiceDtoSchema.parse((await callApi('GET', base)).json)).toMatchObject({
      paidCents: 60_000,
    });
    expect(
      (await callApi('DELETE', `${base}/payments/0194f3a0-0000-7000-8000-999999999999`)).status,
    ).toBe(404);
  });

  it('links the payment found and lets it be dismissed and restored', async () => {
    const closed = (await openInvoices()).find((item) => item.invoice.status === 'closed');
    const base = `/cards/${closed?.accountId}/invoices/${closed?.invoice.month}`;
    const found = closed?.invoice.paymentSuggestion;

    const dismissed = invoiceDtoSchema.parse(
      (
        await callApi('POST', `${base}/payment-suggestion/dismiss`, {
          transactionId: found?.transactionId,
        })
      ).json,
    );
    expect(dismissed.paymentSuggestion).toBeNull();
    expect(dismissed.remainingCents).toBeGreaterThan(0);
    const restored = invoiceDtoSchema.parse(
      (
        await callApi(
          'DELETE',
          `${base}/payment-suggestion/dismiss?transactionId=${found?.transactionId}`,
        )
      ).json,
    );
    expect(restored.paymentSuggestion?.transactionId).toBe(found?.transactionId);

    const linked = invoiceDtoSchema.parse(
      (
        await callApi('POST', `${base}/payments`, {
          amountCents: Math.abs(found?.amountCents ?? 0),
          paidOn: found?.occurredOn,
          transactionId: found?.transactionId,
        })
      ).json,
    );
    expect(linked).toMatchObject({ status: 'paid', paymentSuggestion: null, remainingCents: 0 });
    expect(
      (
        await callApi('POST', `${base}/payments`, {
          amountCents: 100,
          paidOn: found?.occurredOn,
          transactionId: found?.transactionId,
        })
      ).status,
    ).toBe(409);
  });
});

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
    expect(nubank?.breakdown.installmentsCents).toBe(34_900);
    expect(nubank?.breakdown.expectedRecurringCents).toBe(5499);
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
        await callApi('DELETE', `${base}/payment-suggestion/dismiss`, {
          transactionId: found?.transactionId,
        })
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

import { describe, expect, it } from 'vitest';

import { buildInvoicePayments } from '#/features/invoices/invoice-page/utils/build-invoice-payments.util.ts';

describe('buildInvoicePayments', () => {
  it('gives each payment its line and the texts of "Desfazer"', () => {
    const [payment] = buildInvoicePayments([
      { id: 'p1', amountCents: 123_456, paidOn: '2026-10-21', transactionId: null },
    ]);

    expect(payment).toMatchObject({ id: 'p1', label: 'Pago em 21/10', cents: 123_456 });
    expect(payment?.undoContext).toBe('pagamento de 21/10');
    expect(payment?.undoDescription).toContain('R$');
    expect(payment?.undoDescription).toContain('1.234,56');
    expect(payment?.undoDescription).toContain('21/10');
  });

  it('gives nothing for an invoice with no payment', () => {
    expect(buildInvoicePayments([])).toEqual([]);
  });
});

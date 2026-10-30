import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import { buildInvoiceDueLine } from '#/features/invoices/invoice-summary/utils/build-invoice-due-line.util.ts';
import { mapInvoiceStatus } from '#/features/invoices/invoice-summary/utils/map-invoice-status.util.ts';

function invoice(overrides: Partial<Invoice.Dto>): Invoice.Dto {
  return {
    accountId: 'a',
    month: '2026-10',
    closesOn: '2026-10-30',
    dueOn: '2026-11-06',
    status: 'open',
    breakdown: { purchasesCents: 0, installmentsCents: 0, expectedRecurringCents: 0 },
    computedTotalCents: 0,
    bankTotalCents: null,
    totalOverrideCents: null,
    overrideNote: null,
    totalCents: 0,
    paidCents: 0,
    presumedPaidCents: 0,
    remainingCents: 0,
    payments: [],
    paymentSuggestion: null,
    isEditable: true,
    ...overrides,
  };
}

describe('buildInvoiceDueLine', () => {
  it('writes the cycle of an open invoice', () => {
    expect(buildInvoiceDueLine(invoice({}))).toBe('Fecha 30/10, vence 06/11');
  });

  it('writes the closed one in the past tense', () => {
    expect(buildInvoiceDueLine(invoice({ status: 'closed' }))).toBe('Fechou 30/10, vence 06/11');
  });

  it('says what is missing when the payment was partial or the due date passed', () => {
    const partial = invoice({ status: 'partial', remainingCents: 78_490 });
    const overdue = invoice({ status: 'overdue', remainingCents: 78_490 });

    expect(buildInvoiceDueLine(partial)).toMatch(
      /^Fechou 30\/10, vence 06\/11, faltam R\$\s784,90$/,
    );
    expect(buildInvoiceDueLine(overdue)).toMatch(/^Venceu em 06\/11, faltam R\$\s784,90$/);
  });

  it('says when a paid invoice was paid', () => {
    const paid = invoice({
      status: 'paid',
      payments: [{ id: 'p', amountCents: 100, paidOn: '2026-10-21', transactionId: null }],
    });

    expect(buildInvoiceDueLine(paid)).toBe('Paga em 21/10');
  });
});

describe('mapInvoiceStatus', () => {
  it('folds the six statuses into the three looks of the card', () => {
    expect(mapInvoiceStatus('open')).toBe('open');
    expect(mapInvoiceStatus('projected')).toBe('open');
    expect(mapInvoiceStatus('closed')).toBe('closed');
    expect(mapInvoiceStatus('partial')).toBe('closed');
    expect(mapInvoiceStatus('overdue')).toBe('closed');
    expect(mapInvoiceStatus('paid')).toBe('paid');
  });
});

import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import { describeInvoiceDue } from '#/features/invoices/invoice-page/utils/describe-invoice-due.util.ts';

function invoice(overrides: Partial<Invoice.Dto>): Invoice.Dto {
  return {
    accountId: '0194f3a0-0000-7000-8000-000000000001',
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
    paidBeforeFincheck: false,
    ...overrides,
  };
}

describe('describeInvoiceDue', () => {
  it('counts the days to the due date', () => {
    expect(describeInvoiceDue(invoice({}), '2026-10-22')).toBe('vence em 15 dias');
    expect(describeInvoiceDue(invoice({}), '2026-11-04')).toBe('vence em 2 dias');
  });

  it('says tomorrow and today', () => {
    expect(describeInvoiceDue(invoice({}), '2026-11-05')).toBe('vence amanhã');
    expect(describeInvoiceDue(invoice({}), '2026-11-06')).toBe('vence hoje');
  });

  it('says how long ago it was due, in the singular and the plural', () => {
    expect(describeInvoiceDue(invoice({ status: 'overdue' }), '2026-11-07')).toBe(
      'venceu há 1 dia',
    );
    expect(describeInvoiceDue(invoice({ status: 'overdue' }), '2026-11-10')).toBe(
      'venceu há 4 dias',
    );
  });

  it('crosses the end of the year', () => {
    expect(describeInvoiceDue(invoice({ dueOn: '2027-01-06' }), '2026-12-30')).toBe(
      'vence em 7 dias',
    );
  });

  it('says when a paid invoice was paid, or that there is nothing to pay', () => {
    const payment = {
      id: '0194f3a0-0000-7000-8000-000000000002',
      amountCents: 100,
      paidOn: '2026-11-02',
      transactionId: null,
    };
    expect(describeInvoiceDue(invoice({ status: 'paid', payments: [payment] }), '2026-11-20')).toBe(
      'paga em 02/11',
    );
    expect(describeInvoiceDue(invoice({ status: 'paid' }), '2026-11-20')).toBe('nada a pagar');
  });
});

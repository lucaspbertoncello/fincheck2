import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import { buildInvoiceSummary } from '#/features/invoices/invoice-page/utils/build-invoice-summary.util.ts';

function detail(overrides: Partial<Invoice.DetailDto>): Invoice.DetailDto {
  return {
    accountId: '0194f3a0-0000-7000-8000-000000000001',
    month: '2026-09',
    closesOn: '2026-09-05',
    dueOn: '2026-09-12',
    status: 'overdue',
    breakdown: { purchasesCents: 3000, installmentsCents: 0, expectedRecurringCents: 0 },
    computedTotalCents: 3000,
    bankTotalCents: null,
    totalOverrideCents: null,
    overrideNote: null,
    totalCents: 3000,
    paidCents: 0,
    presumedPaidCents: 0,
    remainingCents: 3000,
    payments: [],
    paymentSuggestion: null,
    isEditable: true,
    paidBeforeFincheck: false,
    items: [],
    categoryBreakdown: [],
    previousTotalCents: null,
    highlights: { largestItem: null, endingInstallments: [] },
    nextInvoiceCommittedCents: 0,
    ...overrides,
  };
}

describe('buildInvoiceSummary', () => {
  it('says "Vencida" for an overdue invoice', () => {
    expect(buildInvoiceSummary(detail({}), '2026-11-06').statusLabel).toBe('Vencida');
  });

  it('says "Paga antes do Fincheck" in place of the status when the rule applies', () => {
    const summary = buildInvoiceSummary(
      detail({ status: 'paid', paidBeforeFincheck: true, remainingCents: 0 }),
      '2026-11-06',
    );

    expect(summary).toMatchObject({
      statusLabel: 'Paga antes do Fincheck',
      statusTone: 'ok',
      remainingCents: 0,
      canRegisterPayment: false,
    });
  });
});

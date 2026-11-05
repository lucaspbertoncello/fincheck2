import { describe, expect, it } from 'vitest';

import {
  invoiceCategoryShareSchema,
  invoiceDetailDtoSchema,
  invoiceHighlightsSchema,
  invoiceItemSchema,
  invoicePaymentSuggestionSchema,
  listInvoicesQuerySchema,
  updateInvoiceRequestSchema,
} from '#/invoices/invoice/invoice.schema.ts';

const id = '0194f3a0-0000-7000-8000-000000000001';

describe('listInvoicesQuerySchema', () => {
  it('accepts no range, or a range up to 24 months', () => {
    expect(listInvoicesQuerySchema.safeParse({}).success).toBe(true);
    expect(listInvoicesQuerySchema.safeParse({ from: '2026-01', to: '2027-12' }).success).toBe(
      true,
    );
  });

  it('refuses from after to, and more than 24 months', () => {
    expect(listInvoicesQuerySchema.safeParse({ from: '2026-11', to: '2026-10' }).success).toBe(
      false,
    );
    expect(listInvoicesQuerySchema.safeParse({ from: '2026-01', to: '2028-02' }).success).toBe(
      false,
    );
  });
});

describe('updateInvoiceRequestSchema', () => {
  it('needs at least one field; zero is a valid override', () => {
    expect(updateInvoiceRequestSchema.safeParse({}).success).toBe(false);
    expect(updateInvoiceRequestSchema.safeParse({ totalOverrideCents: 0 }).success).toBe(true);
    expect(updateInvoiceRequestSchema.safeParse({ totalOverrideCents: null }).success).toBe(true);
    expect(updateInvoiceRequestSchema.safeParse({ totalOverrideCents: -1 }).success).toBe(false);
  });
});

describe('invoice items', () => {
  it('tells a transaction from an expected recurrence by type', () => {
    expect(
      invoiceItemSchema.safeParse({
        type: 'transaction',
        transactionId: id,
        description: 'Mercado',
        occurredOn: '2026-10-20',
        amountCents: -8900,
        categoryId: null,
        installment: { number: 3, count: 10 },
      }).success,
    ).toBe(true);
    expect(
      invoiceItemSchema.safeParse({
        type: 'expected_recurrence',
        occurrenceId: id,
        recurrenceName: 'Plano celular',
        expectedOn: null,
        amountCents: 5499,
      }).success,
    ).toBe(true);
    expect(invoiceItemSchema.safeParse({ type: 'other' }).success).toBe(false);
  });
});

describe('invoicePaymentSuggestionSchema', () => {
  it('keeps the sign of the transaction: an outflow is negative', () => {
    const suggestion = {
      transactionId: id,
      accountId: id,
      amountCents: -128490,
      occurredOn: '2026-10-21',
      description: 'PAGAMENTO FATURA',
      isPresumed: true,
    };
    expect(invoicePaymentSuggestionSchema.safeParse(suggestion).success).toBe(true);
    expect(
      invoicePaymentSuggestionSchema.safeParse({ ...suggestion, amountCents: 128490 }).success,
    ).toBe(false);
  });
});

const share = { categoryId: id, totalCents: 41_250, sharePercent: 28.4, itemCount: 6 };

describe('invoiceCategoryShareSchema', () => {
  it('takes a category or none, and money that is more than zero', () => {
    expect(invoiceCategoryShareSchema.safeParse(share).success).toBe(true);
    expect(invoiceCategoryShareSchema.safeParse({ ...share, categoryId: null }).success).toBe(true);
    expect(invoiceCategoryShareSchema.safeParse({ ...share, totalCents: 0 }).success).toBe(false);
    expect(invoiceCategoryShareSchema.safeParse({ ...share, sharePercent: 101 }).success).toBe(
      false,
    );
    expect(invoiceCategoryShareSchema.safeParse({ ...share, itemCount: 0 }).success).toBe(false);
  });
});

describe('invoiceHighlightsSchema', () => {
  const ending = {
    transactionId: id,
    title: 'Geladeira',
    cents: 28_990,
    number: 10,
    total: 10,
  };

  it('accepts no biggest purchase and no ending installment', () => {
    expect(
      invoiceHighlightsSchema.safeParse({ largestItem: null, endingInstallments: [] }).success,
    ).toBe(true);
  });

  it('carries the biggest purchase and the installments that end here', () => {
    expect(
      invoiceHighlightsSchema.safeParse({
        largestItem: { transactionId: id, title: 'Show', cents: 24_000 },
        endingInstallments: [ending],
      }).success,
    ).toBe(true);
    expect(
      invoiceHighlightsSchema.safeParse({
        largestItem: { transactionId: id, title: 'Show', cents: -1 },
        endingInstallments: [],
      }).success,
    ).toBe(false);
  });
});

describe('invoiceDetailDtoSchema', () => {
  const dto = {
    accountId: id,
    month: '2026-10',
    closesOn: '2026-10-30',
    dueOn: '2026-11-06',
    status: 'open',
    breakdown: { purchasesCents: 1000, installmentsCents: 0, expectedRecurringCents: 0 },
    computedTotalCents: 1000,
    bankTotalCents: null,
    totalOverrideCents: null,
    overrideNote: null,
    totalCents: 1000,
    paidCents: 0,
    presumedPaidCents: 0,
    remainingCents: 1000,
    payments: [],
    paymentSuggestion: null,
    isEditable: true,
    items: [],
    categoryBreakdown: [share],
    previousTotalCents: null,
    highlights: { largestItem: null, endingInstallments: [] },
    nextInvoiceCommittedCents: 123_000,
  };

  it('has the breakdown, the previous total, the highlights and what the next invoice has', () => {
    expect(invoiceDetailDtoSchema.safeParse(dto).success).toBe(true);
    expect(invoiceDetailDtoSchema.safeParse({ ...dto, previousTotalCents: -500 }).success).toBe(
      true,
    );
  });

  it('refuses a detail that lacks the new fields', () => {
    const rest = Object.fromEntries(
      Object.entries(dto).filter(([key]) => key !== 'nextInvoiceCommittedCents'),
    );
    expect(invoiceDetailDtoSchema.safeParse(rest).success).toBe(false);
    expect(
      invoiceDetailDtoSchema.safeParse({ ...dto, nextInvoiceCommittedCents: -1 }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import {
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

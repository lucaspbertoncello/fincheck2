import { describe, expect, it } from 'vitest';

import { computeInvoiceVariation } from '#/features/invoices/invoice-page/utils/compute-invoice-variation.util.ts';

describe('computeInvoiceVariation', () => {
  it('is the percent against the invoice before, with the month it is compared to', () => {
    expect(computeInvoiceVariation(112_000, 100_000, '2026-11')).toEqual({
      percent: 12,
      reference: 'outubro',
    });
    expect(computeInvoiceVariation(80_000, 100_000, '2026-11')).toEqual({
      percent: -20,
      reference: 'outubro',
    });
  });

  it('keeps one decimal', () => {
    expect(computeInvoiceVariation(144_200, 100_000, '2026-02')?.percent).toBe(44.2);
  });

  it('takes the month before across the year', () => {
    expect(computeInvoiceVariation(100, 100, '2027-01')).toEqual({
      percent: 0,
      reference: 'dezembro',
    });
  });

  it('has no variation without an invoice before, or when it was zero or a credit', () => {
    expect(computeInvoiceVariation(50_000, null, '2026-11')).toBeNull();
    expect(computeInvoiceVariation(50_000, 0, '2026-11')).toBeNull();
    expect(computeInvoiceVariation(50_000, -3000, '2026-11')).toBeNull();
  });
});

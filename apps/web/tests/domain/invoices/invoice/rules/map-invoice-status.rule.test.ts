import { describe, expect, it } from 'vitest';

import { mapInvoiceStatus } from '#/domain/invoices/invoice/rules/map-invoice-status.rule.ts';

describe('mapInvoiceStatus', () => {
  it('draws a projected invoice as open', () => {
    expect(mapInvoiceStatus('projected')).toBe('open');
  });

  it('keeps the other statuses', () => {
    expect(mapInvoiceStatus('open')).toBe('open');
    expect(mapInvoiceStatus('closed')).toBe('closed');
    expect(mapInvoiceStatus('partial')).toBe('partial');
    expect(mapInvoiceStatus('overdue')).toBe('overdue');
    expect(mapInvoiceStatus('paid')).toBe('paid');
  });
});

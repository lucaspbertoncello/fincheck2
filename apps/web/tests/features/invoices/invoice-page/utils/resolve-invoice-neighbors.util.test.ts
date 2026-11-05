import { describe, expect, it } from 'vitest';

import { resolveInvoiceNeighbors } from '#/features/invoices/invoice-page/utils/resolve-invoice-neighbors.util.ts';

const LISTED = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];

describe('resolveInvoiceNeighbors', () => {
  it('gives the month before and after in the middle', () => {
    expect(resolveInvoiceNeighbors('2026-10', true, LISTED)).toEqual({
      previous: '2026-09',
      next: '2026-11',
    });
  });

  it('has no month after the last one the card lists, and crosses the year', () => {
    expect(resolveInvoiceNeighbors('2027-01', true, LISTED).next).toBeNull();
    expect(resolveInvoiceNeighbors('2026-12', true, LISTED).next).toBe('2027-01');
  });

  it('has no month before when the API has no invoice before', () => {
    expect(resolveInvoiceNeighbors('2026-08', false, LISTED).previous).toBeNull();
  });

  it('has no month after while the list has not arrived', () => {
    expect(resolveInvoiceNeighbors('2026-10', true, []).next).toBeNull();
  });
});

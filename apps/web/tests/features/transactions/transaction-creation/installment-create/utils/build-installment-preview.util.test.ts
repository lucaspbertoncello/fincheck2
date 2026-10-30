import { describe, expect, it } from 'vitest';

import { buildInstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/utils/build-installment-preview.util.ts';
import { buildInvoiceMonths } from '#/features/transactions/transaction-creation/installment-create/utils/build-invoice-months.util.ts';

describe('buildInstallmentPreview', () => {
  it('gives the leftover cent to the first installment and moves the invoice month', () => {
    const preview = buildInstallmentPreview(100000, 12, '2026-11');

    expect(preview.rows.map((row) => row.cents)).toEqual([8337, 8333, 8333, 8333]);
    expect(preview.rows[0]?.monthLabel).toBe('Novembro 2026');
    expect(preview.rows[2]?.monthLabel).toBe('Janeiro 2027');
    expect(preview.hiddenCount).toBe(8);
  });

  it('is empty until total, count and invoice are valid', () => {
    expect(buildInstallmentPreview(0, 6, '2026-11').rows).toEqual([]);
    expect(buildInstallmentPreview(1000, 1, '2026-11').rows).toEqual([]);
    expect(buildInstallmentPreview(1000, 6, null).rows).toEqual([]);
  });

  it('offers the purchase month and the next three as the first invoice', () => {
    expect(buildInvoiceMonths('2026-11-20').map((month) => month.id)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(buildInvoiceMonths('')).toEqual([]);
  });
});

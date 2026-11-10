import { describe, expect, it } from 'vitest';

import { buildInvoiceMonths } from '#/features/transactions/transaction-creation/installment-create/utils/build-invoice-months.util.ts';

describe('buildInvoiceMonths', () => {
  it('offers the purchase month and the next three', () => {
    expect(buildInvoiceMonths('2026-05-12').map((month) => month.id)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(buildInvoiceMonths('not a date')).toEqual([]);
  });

  it('keeps the month a plan already has when it is past the options, in order', () => {
    expect(buildInvoiceMonths('2026-05-12', '2026-11').map((month) => month.id)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-11',
    ]);
    expect(buildInvoiceMonths('2026-05-12', '2026-06')).toHaveLength(4);
  });
});

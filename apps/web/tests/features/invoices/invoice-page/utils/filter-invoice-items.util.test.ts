import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import { filterInvoiceItems } from '#/features/invoices/invoice-page/utils/filter-invoice-items.util.ts';

const FOOD = '0194f3a0-0000-7000-8000-00000000000a';
const ID = '0194f3a0-0000-7000-8000-000000000001';

function transaction(description: string, categoryId: string | null): Invoice.Item {
  return {
    type: 'transaction',
    transactionId: ID,
    description,
    occurredOn: '2026-10-10',
    amountCents: -1000,
    categoryId,
    installment: null,
  };
}

const ITEMS: Invoice.Item[] = [
  transaction('Café do Largo', FOOD),
  transaction('Uber', null),
  {
    type: 'expected_recurrence',
    occurrenceId: ID,
    recurrenceName: 'Plano celular',
    expectedOn: null,
    amountCents: 5499,
  },
];

describe('filterInvoiceItems', () => {
  it('keeps everything with no filter', () => {
    expect(filterInvoiceItems(ITEMS, { categoryKey: null, searchText: '' })).toHaveLength(3);
  });

  it('keeps the lines of a category, and drops the expected recurrences', () => {
    const result = filterInvoiceItems(ITEMS, { categoryKey: FOOD, searchText: '' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ description: 'Café do Largo' });
  });

  it('takes "none" as the lines with no category', () => {
    const result = filterInvoiceItems(ITEMS, { categoryKey: 'none', searchText: '' });
    expect(result).toEqual([ITEMS[1]]);
  });

  it('searches without caring for case or accents, in transactions and recurrences', () => {
    expect(filterInvoiceItems(ITEMS, { categoryKey: null, searchText: 'CAFE' })).toEqual([
      ITEMS[0],
    ]);
    expect(filterInvoiceItems(ITEMS, { categoryKey: null, searchText: 'celular' })).toEqual([
      ITEMS[2],
    ]);
  });

  it('adds the category and the search', () => {
    expect(filterInvoiceItems(ITEMS, { categoryKey: FOOD, searchText: 'uber' })).toEqual([]);
  });
});

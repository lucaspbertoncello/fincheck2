import { describe, expect, it } from 'vitest';

import { transactionListSearchSchema } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import {
  buildListQuery,
  countActiveFilters,
} from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';

describe('transaction list search and query', () => {
  it('defaults to the list view of every type', () => {
    expect(transactionListSearchSchema.parse({})).toMatchObject({ view: 'list', type: 'all' });
  });

  it('an invalid value falls back instead of breaking the screen', () => {
    const search = transactionListSearchSchema.parse({ view: 'x', type: 9, new: 'other', q: 123 });
    expect(search).toMatchObject({ view: 'list', type: 'all', q: '123' });
    expect(search.new).toBeUndefined();
  });

  it('maps the type to the direction and a category wins over "sem categoria"', () => {
    const search = transactionListSearchSchema.parse({
      type: 'expense',
      q: 'ifood',
      category: 'c1',
      uncategorized: true,
    });

    expect(buildListQuery('2026-10', search)).toMatchObject({
      month: '2026-10',
      direction: 'out',
      search: 'ifood',
      categoryId: 'c1',
      uncategorized: undefined,
    });
    expect(countActiveFilters(search)).toBe(2);
  });
});

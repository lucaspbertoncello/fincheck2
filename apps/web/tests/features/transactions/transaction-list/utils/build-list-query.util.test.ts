import { describe, expect, it } from 'vitest';

import { transactionListSearchSchema } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';
import { buildListQuery } from '#/features/transactions/transaction-list/utils/build-list-query.util.ts';
import { countActiveFilters } from '#/features/transactions/transaction-list/utils/count-active-filters.util.ts';
import { buildPeriodListQuery } from '#/features/transactions/transaction-list/utils/build-period-list-query.util.ts';

describe('transaction list search and query', () => {
  it('defaults to the list view of every type, in the month', () => {
    expect(transactionListSearchSchema.parse({})).toMatchObject({
      view: 'list',
      type: 'all',
      period: 'month',
    });
  });

  it('reads the period from the URL and falls back to the month on a value it does not know', () => {
    for (const period of ['12m', 'year', 'all', 'month']) {
      expect(transactionListSearchSchema.parse({ period }).period).toBe(period);
    }
    expect(transactionListSearchSchema.parse({ period: '5y' }).period).toBe('month');
    expect(transactionListSearchSchema.parse({ period: 12 }).period).toBe('month');
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

  it('builds the query of a period with its range, the page size and the same filters', () => {
    const search = transactionListSearchSchema.parse({ type: 'income', q: 'pix', tag: 't1' });

    expect(buildPeriodListQuery({ from: '2025-11-01', to: '2026-10-31' }, search)).toEqual({
      from: '2025-11-01',
      to: '2026-10-31',
      limit: 60,
      direction: 'in',
      search: 'pix',
      accountId: undefined,
      categoryId: undefined,
      uncategorized: undefined,
      tagId: 't1',
      ruleId: undefined,
    });
  });

  it('"Tudo" asks for no range at all, and a period never carries the month', () => {
    const search = transactionListSearchSchema.parse({});
    const query = buildPeriodListQuery({}, search);

    expect(query).not.toHaveProperty('month');
    expect(query).not.toHaveProperty('from');
    expect(query).not.toHaveProperty('to');
    expect(query.limit).toBe(60);
  });
});

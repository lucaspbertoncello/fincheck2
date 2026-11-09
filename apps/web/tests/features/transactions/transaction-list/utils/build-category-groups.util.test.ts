import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { describe, expect, it } from 'vitest';

import { buildCategoryGroups } from '#/features/transactions/transaction-list/utils/build-category-groups.util.ts';
import { buildTransactionLookups } from '#/shared/utils/transactions/build-transaction-lookups.util.ts';
import { makeTransaction } from '#tests/support/transactions/make-transaction.util.ts';

function category(id: string, name: string): Category.Dto {
  return {
    id,
    kind: 'income',
    name,
    icon: 'salary',
    isDefault: false,
    isTransfer: false,
    archivedAt: null,
    transactionCount: 0,
    ruleCount: 0,
    lastUsedOn: null,
  };
}

const lookups = buildTransactionLookups(
  [],
  [category('cat-salary', 'Salário'), category('cat-freela', 'Freela')],
  [],
);

function incomeItem(
  categoryId: string | null,
  receivedCents: number,
  transactionCount: number,
): CategoryBreakdown.IncomeItem {
  return { categoryId, receivedCents, expectedCents: 0, transactionCount, pending: [] };
}

function breakdownOf(items: CategoryBreakdown.IncomeItem[]): CategoryBreakdown.Dto {
  return {
    month: '2026-10',
    comparedUntilOn: null,
    firstMonth: null,
    expenses: { totalCents: 0, previousTotalCents: null, items: [], topGrowth: null },
    review: { count: 0, totalCents: 0 },
    incomes: {
      receivedCents: items.reduce((sum, item) => sum + item.receivedCents, 0),
      expectedCents: 0,
      items,
    },
  };
}

function income(id: string, occurredOn: string, amountCents: number, categoryId: string | null) {
  return makeTransaction({
    id,
    nature: 'income',
    description: `Pix ${id}`,
    occurredOn,
    amountCents,
    categoryId,
  });
}

describe('buildCategoryGroups: the income groups', () => {
  const breakdown = breakdownOf([
    incomeItem('cat-salary', 422722, 5),
    incomeItem('cat-freela', 30000, 1),
    incomeItem(null, 5000, 1),
  ]);

  it('lists the last three transactions of each source, newest first, with the count for "Ver as N"', () => {
    const latest = new Map([
      [
        'cat-salary',
        [
          income('a', '2026-10-05', 100000, 'cat-salary'),
          income('b', '2026-10-20', 120000, 'cat-salary'),
          income('c', '2026-10-12', 110000, 'cat-salary'),
          income('d', '2026-10-01', 90000, 'cat-salary'),
        ],
      ],
    ]);

    const salary = buildCategoryGroups(breakdown, lookups, new Map(), latest, '').incomes[0];

    expect(salary).toMatchObject({ id: 'cat-salary', name: 'Salário', count: 5 });
    expect(salary?.items?.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(salary?.items?.[0]).toMatchObject({
      dateLabel: '20 out.',
      name: 'Pix b',
      cents: 120000,
    });
  });

  it('takes the part of a split transaction that is in the category', () => {
    const split = makeTransaction({
      id: 'split',
      nature: 'income',
      amountCents: 90000,
      description: 'Pix dividido',
      categoryId: null,
      splits: [
        {
          id: 'p1',
          position: 1,
          amountCents: 60000,
          nature: 'income',
          categoryId: 'cat-freela',
          description: 'Parte do freela',
        },
        {
          id: 'p2',
          position: 2,
          amountCents: 30000,
          nature: 'income',
          categoryId: 'cat-salary',
          description: null,
        },
      ],
    });

    const freela = buildCategoryGroups(
      breakdown,
      lookups,
      new Map(),
      new Map([['cat-freela', [split]]]),
      '',
    ).incomes[1];

    expect(freela?.items).toEqual([
      expect.objectContaining({ id: 'split', name: 'Parte do freela', cents: 60000 }),
    ]);
  });

  it('draws the income with no category like the expense with none: dashed, to review, not an open group', () => {
    const other = buildCategoryGroups(breakdown, lookups, new Map(), new Map(), '').incomes[2];

    expect(other).toMatchObject({
      id: 'uncategorized',
      name: 'Outras receitas',
      icon: 'inbox',
      uncategorized: true,
      count: 1,
    });
    expect(other?.items).toEqual([]);
  });

  it('keeps an income with no category and no transaction as an ordinary group', () => {
    const waiting = buildCategoryGroups(
      breakdownOf([incomeItem(null, 0, 0)]),
      lookups,
      new Map(),
      new Map(),
      '',
    ).incomes[0];

    expect(waiting?.uncategorized).toBe(false);
  });

  it('keeps the groups whose name or latest transactions have the search text', () => {
    const latest = new Map([['cat-freela', [income('x', '2026-10-02', 30000, 'cat-freela')]]]);

    expect(
      buildCategoryGroups(breakdown, lookups, new Map(), latest, 'pix x').incomes.map(
        (group) => group.name,
      ),
    ).toEqual(['Freela']);
    expect(
      buildCategoryGroups(breakdown, lookups, new Map(), latest, 'salario').incomes.map(
        (group) => group.name,
      ),
    ).toEqual(['Salário']);
  });
});

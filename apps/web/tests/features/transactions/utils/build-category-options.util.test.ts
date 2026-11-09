import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import { buildCategoryOptions } from '#/features/transactions/utils/build-category-options.util.ts';

function category(overrides: Partial<Category.Dto>): Category.Dto {
  return {
    id: 'c',
    kind: 'expense',
    name: 'Categoria',
    icon: 'food',
    isDefault: false,
    isTransfer: false,
    archivedAt: null,
    transactionCount: 0,
    ruleCount: 0,
    lastUsedOn: null,
    ...overrides,
  };
}

const categories = [
  category({ id: 'food', name: 'Mercado' }),
  category({ id: 'salary', name: 'Salário', kind: 'income' }),
  category({ id: 'rotation', name: 'Rotação entre contas', isTransfer: true }),
  category({ id: 'old', name: 'Antiga', archivedAt: '2026-10-01T00:00:00.000Z' }),
];

const ids = (options: { id: string }[]) => options.map((option) => option.id);

describe('buildCategoryOptions', () => {
  it('lists the active categories of the kind', () => {
    expect(ids(buildCategoryOptions(categories, 'income'))).toEqual(['salary']);
    expect(ids(buildCategoryOptions(categories, 'expense'))).toEqual(['food', 'rotation']);
  });

  it('can add the category that is a transfer to a kind it does not have (both legs)', () => {
    expect(ids(buildCategoryOptions(categories, 'income', { withTransfer: true }))).toEqual([
      'salary',
      'rotation',
    ]);
    expect(ids(buildCategoryOptions(categories, 'expense', { withTransfer: true }))).toEqual([
      'food',
      'rotation',
    ]);
  });
});

import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import { buildCategoryOptionsForKinds } from '#/shared/utils/transactions/build-category-options-for-kinds.util.ts';

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
  category({ id: 'salary', name: 'Salário', kind: 'income' }),
  category({ id: 'food', name: 'Mercado' }),
  category({ id: 'rotation', name: 'Rotação entre contas', isTransfer: true }),
  category({ id: 'old', name: 'Antiga', archivedAt: '2026-10-01T00:00:00.000Z' }),
];

describe('buildCategoryOptionsForKinds', () => {
  it('is the flat list of the kind when there is one kind, with no group', () => {
    const options = buildCategoryOptionsForKinds(categories, ['income']);

    expect(options.map((option) => option.id)).toEqual(['salary']);
    expect(options.some((option) => option.group !== undefined)).toBe(false);
  });

  it('is empty when no kind fits', () => {
    expect(buildCategoryOptionsForKinds(categories, [])).toEqual([]);
  });

  it('puts two kinds in two groups, in the order given, and the transfer last in a group of its own', () => {
    const options = buildCategoryOptionsForKinds(categories, ['expense', 'income'], {
      withTransfer: true,
    });

    expect(options.map((option) => [option.id, option.group])).toEqual([
      ['food', 'Abate gasto'],
      ['salary', 'Conta como receita'],
      ['rotation', 'Transferência'],
    ]);
  });
});

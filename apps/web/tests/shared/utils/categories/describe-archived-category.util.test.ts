import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import { describeArchivedCategory } from '#/shared/utils/categories/describe-archived-category.util.ts';

function category(overrides: Partial<Category.Dto>): Category.Dto {
  return {
    id: 'c1',
    kind: 'expense',
    name: 'Mercado',
    icon: 'cart',
    isDefault: false,
    isTransfer: false,
    archivedAt: null,
    transactionCount: 12,
    ruleCount: 0,
    lastUsedOn: '2026-10-19',
    ...overrides,
  };
}

describe('describeArchivedCategory', () => {
  it('lists the type, the count and the month of the last use', () => {
    expect(
      describeArchivedCategory(
        category({ kind: 'expense', transactionCount: 27, lastUsedOn: '2026-05-12' }),
      ),
    ).toBe('Despesa · 27 transações · usada até maio');
  });

  it('uses the singular and handles a category never used', () => {
    expect(
      describeArchivedCategory(category({ kind: 'income', transactionCount: 1, lastUsedOn: null })),
    ).toBe('Receita · 1 transação · nunca usada');
  });
});

import { describe, expect, it } from 'vitest';

import { rankCategoriesByUse } from '#/features/transactions/transaction-fields/utils/rank-categories-by-use.util.ts';

const categories = [
  { id: 'a', name: 'Alimentação', icon: 'food' as const },
  { id: 'b', name: 'Mercado', icon: 'cart' as const },
  { id: 'c', name: 'Transporte', icon: 'car' as const },
  { id: 'd', name: 'Lazer', icon: 'fun' as const },
];

describe('rankCategoriesByUse', () => {
  it('puts the most used first and keeps the given order among ties and unused ones', () => {
    const ranked = rankCategoriesByUse(categories, [
      { categoryId: 'c' },
      { categoryId: 'b' },
      { categoryId: 'c' },
      { categoryId: null },
      { categoryId: 'unknown' },
    ]);

    expect(ranked.map((category) => category.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('keeps the order when nothing was used yet', () => {
    expect(rankCategoriesByUse(categories, []).map((category) => category.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { rankCategoriesByUse } from '#/features/transactions/utils/rank-categories-by-use.util.ts';

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

describe('rankCategoriesByUse with groups', () => {
  const grouped = [
    { id: 'a', name: 'Alimentação', icon: 'food' as const, group: 'Abate gasto' },
    { id: 'b', name: 'Mercado', icon: 'cart' as const, group: 'Abate gasto' },
    { id: 's', name: 'Salário', icon: 'cart' as const, group: 'Conta como receita' },
    { id: 'r', name: 'Reembolso', icon: 'cart' as const, group: 'Conta como receita' },
  ];

  it('ranks inside each group and keeps the groups in the order they came', () => {
    const ranked = rankCategoriesByUse(grouped, [
      { categoryId: 'r' },
      { categoryId: 'r' },
      { categoryId: 's' },
      { categoryId: 'b' },
    ]);

    expect(ranked.map((category) => category.id)).toEqual(['b', 'a', 'r', 's']);
  });
});

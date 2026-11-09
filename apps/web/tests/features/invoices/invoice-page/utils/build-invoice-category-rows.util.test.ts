import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import { buildInvoiceCategoryRows } from '#/features/invoices/invoice-page/utils/build-invoice-category-rows.util.ts';

const FOOD = '0194f3a0-0000-7000-8000-00000000000a';
const CATEGORIES = [{ id: FOOD, name: 'Mercado', icon: 'cart' }] as Category.Dto[];

describe('buildInvoiceCategoryRows', () => {
  const breakdown = [
    { categoryId: FOOD, isLent: false, totalCents: 60_000, sharePercent: 60, itemCount: 4 },
    { categoryId: null, isLent: false, totalCents: 39_000, sharePercent: 39, itemCount: 1 },
    { categoryId: FOOD, isLent: false, totalCents: 1000, sharePercent: 0.4, itemCount: 1 },
  ];

  it('names the category, takes its icon and keeps the order of the API', () => {
    const rows = buildInvoiceCategoryRows(breakdown, CATEGORIES, null);

    expect(rows[0]).toMatchObject({
      key: FOOD,
      name: 'Mercado',
      icon: 'cart',
      totalCents: 60_000,
      shareLabel: '60%',
      countLabel: '4 lançamentos',
      selected: false,
    });
  });

  it('calls what has no category "Sem categoria", with the key "none"', () => {
    const rows = buildInvoiceCategoryRows(breakdown, CATEGORIES, null);
    expect(rows[1]).toMatchObject({
      key: 'none',
      name: 'Sem categoria',
      countLabel: '1 lançamento',
    });
  });

  it('says "<1%" for a share that rounds to zero', () => {
    expect(buildInvoiceCategoryRows(breakdown, CATEGORIES, null)[2]?.shareLabel).toBe('<1%');
  });

  it('marks the chosen one', () => {
    const rows = buildInvoiceCategoryRows(breakdown, CATEGORIES, 'none');
    expect(rows.map((row) => row.selected)).toEqual([false, true, false]);
  });

  it('gives what was lent its own line, "Emprestado", apart from what has no category (isLent)', () => {
    const rows = buildInvoiceCategoryRows(
      [
        { categoryId: null, isLent: false, totalCents: 20_000, sharePercent: 50, itemCount: 1 },
        { categoryId: null, isLent: true, totalCents: 20_000, sharePercent: 50, itemCount: 2 },
      ],
      CATEGORIES,
      null,
    );

    expect(rows.map((row) => [row.key, row.name, row.isLent])).toEqual([
      ['none', 'Sem categoria', false],
      ['lent', 'Emprestado', true],
    ]);
    expect(rows[1]).toMatchObject({ icon: 'hand-money', countLabel: '2 lançamentos' });
  });
});

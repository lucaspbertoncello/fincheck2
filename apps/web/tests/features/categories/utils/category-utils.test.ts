import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { buildTagGroups } from '#/features/categories/utils/build-tag-groups.util.ts';
import { filterCategories } from '#/features/categories/utils/filter-categories.util.ts';
import { countCategoriesByFilter } from '#/features/categories/utils/count-categories-by-filter.util.ts';
import { formatLastUsed } from '#/features/categories/utils/format-last-used.util.ts';
import { toManagedCategory } from '#/features/categories/utils/to-managed-category.util.ts';

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

describe('formatLastUsed', () => {
  const today = '2026-10-22';

  it('says hoje and ontem', () => {
    expect(formatLastUsed('2026-10-22', today)).toBe('hoje');
    expect(formatLastUsed('2026-10-21', today)).toBe('ontem');
  });

  it('writes the day and month within a month', () => {
    expect(formatLastUsed('2026-10-03', today)).toBe('3 out.');
  });

  it('adds how long ago past a month', () => {
    expect(formatLastUsed('2026-08-28', today)).toBe('28 ago., há 1 mês');
    expect(formatLastUsed('2026-07-14', today)).toBe('14 jul., há 3 meses');
  });

  it('adds the year when it is not this one', () => {
    expect(formatLastUsed('2025-03-09', today)).toBe('9 mar. 2025, há 19 meses');
  });

  it('has a dash for a category never used', () => {
    expect(formatLastUsed(null, today)).toBe('—');
  });
});

describe('filterCategories and countCategoriesByFilter', () => {
  const all = [
    category({ id: 'a', name: 'Mercado' }),
    category({ id: 'b', name: 'Educação' }),
    category({ id: 'c', name: 'Salário', kind: 'income' }),
    category({ id: 'd', name: 'Viagem', archivedAt: '2026-07-01T00:00:00.000Z' }),
  ];

  it('keeps one tab at a time; archived ones only in Arquivadas', () => {
    expect(filterCategories(all, 'expense', '').map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterCategories(all, 'income', '').map((item) => item.id)).toEqual(['c']);
    expect(filterCategories(all, 'archived', '').map((item) => item.id)).toEqual(['d']);
  });

  it('searches without caring about case or accents', () => {
    expect(filterCategories(all, 'expense', 'EDUCACAO').map((item) => item.id)).toEqual(['b']);
    expect(filterCategories(all, 'expense', '  merc ').map((item) => item.id)).toEqual(['a']);
  });

  it('counts the whole list for the tabs', () => {
    expect(countCategoriesByFilter(all)).toEqual({ expense: 2, income: 1, archived: 1 });
  });
});

describe('toManagedCategory', () => {
  it('maps the contract icon to the design icon and fills the last use', () => {
    const row = toManagedCategory(category({ icon: 'deliv', ruleCount: 1 }), '2026-10-22');

    expect(row).toMatchObject({
      icon: 'delivery',
      ruleCount: 1,
      lastUsedLabel: '19 out.',
      archived: false,
      archivedNote: undefined,
    });
  });

  it('adds the note for an archived category', () => {
    const row = toManagedCategory(
      category({ archivedAt: '2026-07-01T00:00:00.000Z' }),
      '2026-10-22',
    );

    expect(row.archived).toBe(true);
    expect(row.archivedNote).toContain('Despesa');
  });
});

describe('buildTagGroups', () => {
  const tag = (overrides: Partial<Tag.Dto>): Tag.Dto => ({
    id: 't1',
    categoryId: 'c1',
    name: 'feira',
    archivedAt: null,
    transactionCount: 0,
    ...overrides,
  });

  it('groups the tags by category, expense before income, each by name, and gives every active category a group', () => {
    const groups = buildTagGroups(
      [
        category({ id: 'c1', name: 'Mercado' }),
        category({ id: 'c2', name: 'Salário', kind: 'income' }),
        category({ id: 'c3', name: 'Casa' }),
      ],
      [tag({ id: 't1', name: 'feira' }), tag({ id: 't2', categoryId: 'c2', name: 'bônus' })],
    );

    expect(groups.map((group) => [group.name, group.tags.map((item) => item.name)])).toEqual([
      ['Casa', []],
      ['Mercado', ['feira']],
      ['Salário', ['bônus']],
    ]);
    expect(groups.every((group) => group.canCreate)).toBe(true);
  });

  it('keeps the archived tags apart and shows an archived category only while it holds tags, with no way to create', () => {
    const groups = buildTagGroups(
      [
        category({ id: 'c1', name: 'Mercado' }),
        category({ id: 'c4', name: 'Velha', archivedAt: '2026-01-01T00:00:00.000Z' }),
        category({ id: 'c5', name: 'Vazia', archivedAt: '2026-01-01T00:00:00.000Z' }),
      ],
      [
        tag({ id: 't1', archivedAt: '2026-01-01T00:00:00.000Z' }),
        tag({ id: 't4', categoryId: 'c4', name: 'resto' }),
      ],
    );

    expect(groups.map((group) => group.name)).toEqual(['Mercado', 'Velha']);
    expect(groups[0]?.tags).toEqual([]);
    expect(groups[0]?.archivedTags.map((item) => item.name)).toEqual(['feira']);
    expect(groups[1]?.canCreate).toBe(false);
  });
});

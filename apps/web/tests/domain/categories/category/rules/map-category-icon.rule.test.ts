import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import { describe, expect, it } from 'vitest';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

describe('mapCategoryIcon', () => {
  it('renames the icons the contract spells differently', () => {
    expect(mapCategoryIcon('deliv')).toBe('delivery');
    expect(mapCategoryIcon('subs')).toBe('subscription');
    expect(mapCategoryIcon('handmoney')).toBe('hand-money');
  });

  it('knows every icon of the contract and falls back to the tag', () => {
    for (const icon of CATEGORY_ICONS) expect(mapCategoryIcon(icon)).toBeTruthy();
    expect(mapCategoryIcon('nope')).toBe('tag');
    expect(mapCategoryIcon(undefined)).toBe('tag');
    expect(mapCategoryIcon(null)).toBe('tag');
    expect(mapCategoryIcon(undefined, 'receipt')).toBe('receipt');
  });
});

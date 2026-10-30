import { describe, expect, it } from 'vitest';

import { resolveCategoryIcon } from '#/features/bills/utils/resolve-category-icon.util.ts';

describe('resolveCategoryIcon', () => {
  it('renames the keys of the API that the icon set spells differently', () => {
    expect(resolveCategoryIcon('deliv')).toBe('delivery');
    expect(resolveCategoryIcon('subs')).toBe('subscription');
    expect(resolveCategoryIcon('house')).toBe('house');
  });

  it('falls back when there is no icon', () => {
    expect(resolveCategoryIcon(null)).toBe('tag');
    expect(resolveCategoryIcon(undefined, 'receipt')).toBe('receipt');
  });
});

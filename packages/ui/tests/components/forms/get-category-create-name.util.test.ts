import { describe, expect, it } from 'vitest';

import { getCategoryCreateName } from '#/components/forms/get-category-create-name.util.ts';

const CATEGORIES = [
  { id: 'a', name: 'Mercado', icon: 'cart' as const },
  { id: 'b', name: 'Educação', icon: 'book' as const },
];

describe('getCategoryCreateName', () => {
  it('is the typed text, trimmed, when no category has that name', () => {
    expect(getCategoryCreateName(CATEGORIES, '  Pets ')).toBe('Pets');
  });

  it('is empty with nothing typed, so only the fixed line shows', () => {
    expect(getCategoryCreateName(CATEGORIES, '')).toBe('');
    expect(getCategoryCreateName(CATEGORIES, '   ')).toBe('');
  });

  it('is empty when the text is already a category, whatever the case or the accent', () => {
    expect(getCategoryCreateName(CATEGORIES, 'mercado')).toBe('');
    expect(getCategoryCreateName(CATEGORIES, 'EDUCACAO')).toBe('');
  });

  it('offers the text that only starts a category name: it is not that category yet', () => {
    expect(getCategoryCreateName(CATEGORIES, 'Merc')).toBe('Merc');
  });
});

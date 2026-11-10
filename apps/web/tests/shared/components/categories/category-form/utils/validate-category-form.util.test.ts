import { describe, expect, it } from 'vitest';

import { validateCategoryForm } from '#/shared/components/categories/category-form/utils/validate-category-form.util.ts';

describe('validateCategoryForm', () => {
  it('accepts a name and trims it', () => {
    const result = validateCategoryForm({ kind: 'expense', name: '  Barbearia ', icon: 'gym' });

    expect(result).toEqual({
      ok: true,
      body: { kind: 'expense', name: 'Barbearia', icon: 'gym' },
    });
  });

  it('asks for a name when it is empty or only spaces', () => {
    expect(validateCategoryForm({ kind: 'expense', name: '   ', icon: 'tag' })).toEqual({
      ok: false,
      errors: { name: 'Dê um nome à categoria.' },
    });
  });

  it('refuses a name past 40 characters', () => {
    expect(validateCategoryForm({ kind: 'income', name: 'x'.repeat(41), icon: 'tag' })).toEqual({
      ok: false,
      errors: { name: 'Use até 40 caracteres.' },
    });
  });
});

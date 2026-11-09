import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { describe, expect, it } from 'vitest';

import { validateCategoryForm } from '#/features/categories/category-form/utils/validate-category-form.util.ts';
import { buildArchiveCategoryImpact } from '#/features/categories/utils/build-archive-category-impact.util.ts';
import { validateTagName } from '#/features/categories/tag-form/utils/validate-tag-name.util.ts';

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

describe('validateTagName', () => {
  it('accepts a name and trims it', () => {
    expect(validateTagName(' viagem ')).toEqual({ ok: true, name: 'viagem' });
  });

  it('refuses an empty name and one past 30 characters', () => {
    expect(validateTagName('')).toEqual({ ok: false, error: 'Dê um nome à tag.' });
    expect(validateTagName('t'.repeat(31))).toEqual({
      ok: false,
      error: 'Use até 30 caracteres.',
    });
  });
});

describe('buildArchiveCategoryImpact', () => {
  const base: Category.Dto = {
    id: 'c1',
    kind: 'expense',
    name: 'Delivery',
    icon: 'deliv',
    isTransfer: false,
    isDefault: false,
    archivedAt: null,
    transactionCount: 112,
    ruleCount: 0,
    lastUsedOn: null,
  };

  it('says the transactions stay and that it can be undone', () => {
    const texts = buildArchiveCategoryImpact(base).map((change) => change.text);

    expect(texts).toContain('112 transações continuam nela e seguem somando no histórico.');
    expect(texts).toContain('Você pode desarquivar quando quiser.');
    expect(texts.some((text) => text.includes('regra'))).toBe(false);
  });

  it('warns about the rules that keep running without the category', () => {
    const one = buildArchiveCategoryImpact({ ...base, ruleCount: 1 }).map((change) => change.text);
    const many = buildArchiveCategoryImpact({ ...base, ruleCount: 3 }).map((change) => change.text);

    expect(one).toContain(
      '1 regra segue ligada, mas a categoria deixa de ser posta, e as tags dela junto.',
    );
    expect(many.some((text) => text.startsWith('3 regras seguem ligadas'))).toBe(true);
  });

  it('handles a category nobody uses', () => {
    const texts = buildArchiveCategoryImpact({ ...base, transactionCount: 0 }).map(
      (change) => change.text,
    );

    expect(texts).toContain('Nenhuma transação usa essa categoria.');
  });
});

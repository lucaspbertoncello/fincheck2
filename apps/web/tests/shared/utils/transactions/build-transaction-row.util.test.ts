import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { describe, expect, it } from 'vitest';

import { buildTransactionLookups } from '#/shared/utils/transactions/build-transaction-lookups.util.ts';
import { buildTransactionRow } from '#/shared/utils/transactions/build-transaction-row.util.ts';
import { makeTransaction } from '#tests/support/transactions/make-transaction.util.ts';

function category(id: string, name: string, overrides: Partial<Category.Dto> = {}): Category.Dto {
  return {
    id,
    kind: 'expense',
    name,
    icon: 'tag',
    isDefault: false,
    isTransfer: false,
    archivedAt: null,
    transactionCount: 0,
    ruleCount: 0,
    lastUsedOn: null,
    ...overrides,
  };
}

function tag(id: string, name: string): Tag.Dto {
  return { id, categoryId: 'cat-market', name, archivedAt: null, transactionCount: 0 };
}

const lookups = buildTransactionLookups(
  [],
  [
    category('cat-market', 'Mercado'),
    category('cat-home', 'Casa'),
    category('cat-health', 'Saúde'),
    category('cat-rotation', 'Rotação entre contas', { isTransfer: true }),
  ],
  [tag('tag-b', 'bairro'), tag('tag-a', 'ajuda')],
);

function part(position: number, categoryId: string | null, nature = 'expense' as const) {
  return {
    id: `part-${position}`,
    position,
    amountCents: -2500,
    nature,
    categoryId,
    description: null,
  };
}

describe('buildTransactionRow: the category of the row', () => {
  it('names the category of an ordinary transaction, with its tags in order', () => {
    const row = buildTransactionRow(
      makeTransaction({ categoryId: 'cat-market', tagIds: ['tag-b', 'tag-a'] }),
      lookups,
    );

    expect(row.categoryNames).toEqual(['Mercado']);
    expect(row.tags).toEqual(['ajuda', 'bairro']);
    expect(row.uncategorized).toBe(false);
  });

  it('has no name and is "sem categoria" when an expense has no category', () => {
    const row = buildTransactionRow(makeTransaction({ categoryId: null }), lookups);

    expect(row.categoryNames).toEqual([]);
    expect(row.uncategorized).toBe(true);
  });

  it('names the category of each part of a split transaction, once, in the order of the parts', () => {
    const row = buildTransactionRow(
      makeTransaction({
        categoryId: null,
        splits: [part(2, 'cat-home'), part(1, 'cat-market'), part(3, 'cat-home')],
      }),
      lookups,
    );

    expect(row.categoryNames).toEqual(['Mercado', 'Casa']);
    expect(row.splitParts).toBe(3);
    expect(row.uncategorized).toBe(false);
  });

  it('says "Sem categoria" for a part with no category and "Dívida com amigo" for a lent one', () => {
    const row = buildTransactionRow(
      makeTransaction({
        categoryId: null,
        splits: [part(1, 'cat-market'), part(2, null), { ...part(3, null), nature: 'lent' }],
      }),
      lookups,
    );

    expect(row.categoryNames).toEqual(['Mercado', 'Sem categoria', 'Dívida com amigo']);
  });

  it('says what a transaction out of the account is when it has no category', () => {
    const row = buildTransactionRow(
      makeTransaction({ nature: 'invoice_payment', categoryId: null }),
      lookups,
    );

    expect(row.categoryNames).toEqual(['Pagamento de fatura']);
    expect(row.outOfAccount).toBe(true);
  });

  it('names the category that is a transfer on the legs it made', () => {
    const row = buildTransactionRow(
      makeTransaction({ nature: 'transfer', categoryId: 'cat-rotation', amountCents: -20000 }),
      lookups,
    );

    expect(row.categoryNames).toEqual(['Rotação entre contas']);
  });
});

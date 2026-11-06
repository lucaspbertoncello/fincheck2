import { describe, expect, it } from 'vitest';

import { suggestCategoriesForDescription } from '#/modules/categories/domain/suggestion/suggest-categories-for-description.util.ts';

const CATEGORIES = new Map([
  ['food', { kind: 'expense' as const, isArchived: false }],
  ['delivery', { kind: 'expense' as const, isArchived: false }],
  ['transport', { kind: 'expense' as const, isArchived: false }],
  ['market', { kind: 'expense' as const, isArchived: false }],
  ['old', { kind: 'expense' as const, isArchived: true }],
  ['salary', { kind: 'income' as const, isArchived: false }],
]);

const NO_RULE = {
  counterpartyContains: null,
  accountId: null,
  kind: null,
  amountMinCents: null,
  amountMaxCents: null,
};

function suggest(overrides: Partial<Parameters<typeof suggestCategoriesForDescription>[0]> = {}) {
  return suggestCategoriesForDescription({
    description: 'IFOOD *RESTAURANTE',
    amountCents: -5280,
    historyCounts: new Map(),
    rules: [],
    categories: CATEGORIES,
    ...overrides,
  });
}

describe('suggestCategoriesForDescription', () => {
  it('puts the history first, the most used category first', () => {
    expect(
      suggest({
        historyCounts: new Map([
          ['food', 1],
          ['delivery', 4],
        ]),
      }),
    ).toEqual([
      { categoryId: 'delivery', reason: 'history' },
      { categoryId: 'food', reason: 'history' },
    ]);
  });

  it('adds the categories of the rules after the history, without repeating one', () => {
    const rules = [
      { ...NO_RULE, descriptionContains: 'IFOOD', categoryId: 'delivery' },
      { ...NO_RULE, descriptionContains: 'RESTAURANTE', categoryId: 'food' },
    ];

    expect(suggest({ historyCounts: new Map([['delivery', 2]]), rules })).toEqual([
      { categoryId: 'delivery', reason: 'history' },
      { categoryId: 'food', reason: 'rule' },
    ]);
  });

  it('gives at most three', () => {
    const historyCounts = new Map([
      ['food', 4],
      ['delivery', 3],
      ['transport', 2],
      ['market', 1],
    ]);

    expect(suggest({ historyCounts }).map((item) => item.categoryId)).toEqual([
      'food',
      'delivery',
      'transport',
    ]);
  });

  it('leaves out an archived category and one of the wrong kind', () => {
    expect(
      suggest({
        historyCounts: new Map([
          ['old', 9],
          ['salary', 9],
          ['unknown', 9],
          ['food', 1],
        ]),
      }),
    ).toEqual([{ categoryId: 'food', reason: 'history' }]);
    // A positive amount is an income: only income categories.
    expect(
      suggest({
        amountCents: 450000,
        historyCounts: new Map([
          ['food', 9],
          ['salary', 1],
        ]),
      }),
    ).toEqual([{ categoryId: 'salary', reason: 'history' }]);
  });

  describe('rules', () => {
    it('only count when their text is in the description and the kind and the range fit', () => {
      const rule = { ...NO_RULE, descriptionContains: 'IFOOD', categoryId: 'delivery' };

      expect(suggest({ rules: [rule] })).toHaveLength(1);
      expect(suggest({ rules: [{ ...rule, descriptionContains: 'UBER' }] })).toEqual([]);
      expect(suggest({ rules: [{ ...rule, kind: 'income' }] })).toEqual([]);
      expect(suggest({ rules: [{ ...rule, amountMinCents: 6000 }] })).toEqual([]);
      expect(suggest({ rules: [{ ...rule, amountMaxCents: 5000 }] })).toEqual([]);
      expect(
        suggest({ rules: [{ ...rule, amountMinCents: 5280, amountMaxCents: 5280 }] }),
      ).toHaveLength(1);
    });

    it('are left out when they depend on the sender or the account, which the queue does not carry', () => {
      const rule = { ...NO_RULE, descriptionContains: 'IFOOD', categoryId: 'delivery' };

      expect(suggest({ rules: [{ ...rule, counterpartyContains: 'X' }] })).toEqual([]);
      expect(suggest({ rules: [{ ...rule, accountId: 'account-1' }] })).toEqual([]);
    });

    it('are left out when they only add tags', () => {
      expect(
        suggest({ rules: [{ ...NO_RULE, descriptionContains: 'IFOOD', categoryId: null }] }),
      ).toEqual([]);
    });
  });
});

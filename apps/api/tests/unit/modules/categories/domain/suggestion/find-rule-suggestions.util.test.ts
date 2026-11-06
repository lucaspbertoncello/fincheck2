import { describe, expect, it } from 'vitest';

import { findRuleSuggestions } from '#/modules/categories/domain/suggestion/find-rule-suggestions.util.ts';

const CATEGORIES = new Map([
  ['transport', { kind: 'expense' as const, isArchived: false }],
  ['food', { kind: 'expense' as const, isArchived: false }],
  ['old', { kind: 'expense' as const, isArchived: true }],
]);

function manual(pattern: string, categoryId: string, count: number, prefix = pattern) {
  return Array.from({ length: count }, (_, index) => ({
    transactionId: `${prefix}-${categoryId}-${String(index)}`,
    pattern,
    categoryId,
  }));
}

function suggest(overrides: Partial<Parameters<typeof findRuleSuggestions>[0]> = {}) {
  return findRuleSuggestions({
    manualCategorizations: [],
    categories: CATEGORIES,
    enabledRules: [],
    decided: [],
    transactionIds: null,
    ...overrides,
  });
}

describe('findRuleSuggestions', () => {
  it('suggests from three transactions with the same description in the same category', () => {
    expect(suggest({ manualCategorizations: manual('UBER *TRIP', 'transport', 3) })).toEqual([
      { pattern: 'UBER *TRIP', categoryId: 'transport', kind: 'expense', recategorizedCount: 3 },
    ]);
  });

  it('does not suggest from two', () => {
    expect(suggest({ manualCategorizations: manual('UBER *TRIP', 'transport', 2) })).toEqual([]);
  });

  it('counts a category apart: three in two categories make no suggestion', () => {
    expect(
      suggest({
        manualCategorizations: [
          ...manual('PADARIA', 'food', 2),
          ...manual('PADARIA', 'transport', 2),
        ],
      }),
    ).toEqual([]);
  });

  it('does not suggest to an archived category nor to an unknown one', () => {
    expect(suggest({ manualCategorizations: manual('X', 'old', 4) })).toEqual([]);
    expect(suggest({ manualCategorizations: manual('X', 'gone', 4) })).toEqual([]);
  });

  describe('a rule that is on already covers it (N11)', () => {
    const uber = manual('UBER *TRIP', 'transport', 3);

    it('when its text is inside the pattern and its category is the same', () => {
      expect(
        suggest({
          manualCategorizations: uber,
          enabledRules: [{ descriptionContains: 'UBER', categoryId: 'transport' }],
        }),
      ).toEqual([]);
    });

    it('not when it sends to another category: Lucas keeps correcting it', () => {
      expect(
        suggest({
          manualCategorizations: uber,
          enabledRules: [{ descriptionContains: 'UBER', categoryId: 'food' }],
        }),
      ).toHaveLength(1);
    });

    it('not when its text is not inside the pattern, or it has no description text', () => {
      expect(
        suggest({
          manualCategorizations: uber,
          enabledRules: [
            { descriptionContains: 'UBER EATS', categoryId: 'transport' },
            { descriptionContains: null, categoryId: 'transport' },
          ],
        }),
      ).toHaveLength(1);
    });
  });

  it('does not come back after an answer to the same pattern and category, but does for another', () => {
    const both = [...manual('UBER *TRIP', 'transport', 3), ...manual('UBER *TRIP', 'food', 3)];

    const suggestions = suggest({
      manualCategorizations: both,
      decided: [{ pattern: 'UBER *TRIP', categoryId: 'transport' }],
    });

    expect(suggestions.map((item) => item.categoryId)).toEqual(['food']);
  });

  it('keeps only the groups that hold one of the given transactions', () => {
    const all = [...manual('A', 'food', 3), ...manual('B', 'food', 3)];

    expect(
      suggest({ manualCategorizations: all, transactionIds: new Set(['B-food-1', 'other']) }).map(
        (item) => item.pattern,
      ),
    ).toEqual(['B']);
  });

  it('orders by the most repeated, then by pattern', () => {
    const all = [
      ...manual('ZETA', 'food', 3),
      ...manual('ALFA', 'food', 3),
      ...manual('MEIO', 'food', 5),
    ];

    expect(suggest({ manualCategorizations: all }).map((item) => item.pattern)).toEqual([
      'MEIO',
      'ALFA',
      'ZETA',
    ]);
  });

  it('ignores an empty description', () => {
    expect(suggest({ manualCategorizations: manual('', 'food', 5, 'empty') })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { classifyRuleEffect } from '#/modules/transactions/application/category-rule-history/classify-rule-effect.util.ts';
import type { LoadRuleHistoryCandidatesQuery } from '#/modules/transactions/application/category-rule-history/load-rule-history-candidates.query.ts';

type Candidate = LoadRuleHistoryCandidatesQuery.Candidate;

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'tx-1',
    description: 'Uber *Trip',
    bankDescription: null,
    counterparty: null,
    nature: 'expense',
    accountId: 'account-1',
    amountCents: -2500,
    occurredOn: '2026-11-01',
    categoryId: null,
    categorySource: null,
    categoryRuleId: null,
    tagIds: [],
    ...overrides,
  };
}

function definition(overrides: Partial<classifyRuleEffect.Definition> = {}) {
  return {
    categoryId: 'transport',
    categoryKind: 'expense',
    tagIds: [],
    olderRuleIds: new Set<string>(),
    matches: (item: Candidate) => item.description.toUpperCase().includes('UBER'),
    ...overrides,
  } satisfies classifyRuleEffect.Definition;
}

const ids = (items: Candidate[]) => items.map((item) => item.id);

describe('classifyRuleEffect', () => {
  it('matches by the function it is given and changes what has no category', () => {
    const result = classifyRuleEffect(
      [
        candidate({ id: 'a' }),
        candidate({ id: 'b', description: 'Padaria' }),
        candidate({ id: 'c', categoryId: 'food', categorySource: 'rule', categoryRuleId: 'r0' }),
      ],
      definition(),
    );

    expect(result.matchCount).toBe(2);
    expect(ids(result.changes)).toEqual(['a', 'c']);
  });

  it('does not change a category Lucas, a recurrence or a bill put, but counts it as a match', () => {
    const result = classifyRuleEffect(
      (['user', 'recurrence', 'bill'] as const).map((source) =>
        candidate({ id: source, categoryId: 'food', categorySource: source }),
      ),
      definition(),
    );

    expect(result.matchCount).toBe(3);
    expect(result.changes).toEqual([]);
  });

  it('does not change what an older rule categorized (N9), but takes over from a younger one', () => {
    const result = classifyRuleEffect(
      [
        candidate({
          id: 'older',
          categoryId: 'food',
          categorySource: 'rule',
          categoryRuleId: 'r-old',
        }),
        candidate({
          id: 'younger',
          categoryId: 'food',
          categorySource: 'rule',
          categoryRuleId: 'r-new',
        }),
      ],
      definition({ olderRuleIds: new Set(['r-old']) }),
    );

    expect(ids(result.changes)).toEqual(['younger']);
  });

  it('does not count a transaction that already has the category and the tags', () => {
    const result = classifyRuleEffect(
      [
        candidate({
          id: 'done',
          categoryId: 'transport',
          categorySource: 'rule',
          categoryRuleId: 'self',
          tagIds: ['trip'],
        }),
        candidate({
          id: 'missing-tag',
          categoryId: 'transport',
          categorySource: 'rule',
          tagIds: [],
        }),
      ],
      definition({ tagIds: ['trip'] }),
    );

    expect(result.matchCount).toBe(2);
    expect(ids(result.changes)).toEqual(['missing-tag']);
  });

  it('is blind to the other kind when the rule has a category', () => {
    const result = classifyRuleEffect(
      [
        candidate({ id: 'expense' }),
        candidate({ id: 'income', nature: 'income', amountCents: 2500 }),
      ],
      definition(),
    );

    expect(result.matchCount).toBe(1);
    expect(ids(result.changes)).toEqual(['expense']);
  });

  it('changes nothing when the rule has tags but no category: the tags only go with the category they belong to', () => {
    const result = classifyRuleEffect(
      [
        candidate({ id: 'by-hand', categoryId: 'food', categorySource: 'user' }),
        candidate({ id: 'tagged', tagIds: ['trip'] }),
        candidate({ id: 'income', nature: 'income', amountCents: 10 }),
      ],
      definition({ categoryId: null, categoryKind: null, tagIds: ['trip'] }),
    );

    expect(result.matchCount).toBe(3);
    expect(result.changes).toEqual([]);
  });

  it('counts every match as a change when the rule has no action yet (a preview of a form being filled)', () => {
    const result = classifyRuleEffect(
      [candidate({ id: 'a' }), candidate({ id: 'b', categoryId: 'food', categorySource: 'user' })],
      definition({ categoryId: null, categoryKind: null }),
    );

    expect(result.matchCount).toBe(2);
    expect(result.changes).toHaveLength(2);
  });

  it('gives up to three examples, the most recent first', () => {
    const result = classifyRuleEffect(
      [
        candidate({ id: 'd1', occurredOn: '2026-10-01' }),
        candidate({ id: 'd4', occurredOn: '2026-11-04' }),
        candidate({ id: 'd2', occurredOn: '2026-10-02' }),
        candidate({ id: 'd3', occurredOn: '2026-11-03', categoryId: 'food' }),
      ],
      definition(),
    );

    expect(result.changes).toHaveLength(4);
    expect(result.examples).toHaveLength(3);
    expect(result.examples.map((example) => example.transactionId)).toEqual(['d4', 'd3', 'd2']);
    expect(result.examples[1]).toMatchObject({
      description: 'Uber *Trip',
      amountCents: -2500,
      fromCategoryId: 'food',
      toCategoryId: 'transport',
    });
  });
});

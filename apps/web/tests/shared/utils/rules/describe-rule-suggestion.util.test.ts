import { describe, expect, it } from 'vitest';

import { describeRuleSuggestion } from '#/shared/utils/rules/describe-rule-suggestion.util.ts';

describe('describeRuleSuggestion', () => {
  it('says where the transactions are, in the plural', () => {
    expect(
      describeRuleSuggestion({ count: 24, pattern: 'NOTEBOOK', categoryName: 'Tecnologia' }),
    ).toBe(
      '24 transações com a descrição “NOTEBOOK” estão em Tecnologia. A regra põe essa categoria nas próximas sozinha.',
    );
  });

  it('agrees with a single transaction', () => {
    expect(describeRuleSuggestion({ count: 1, pattern: 'X', categoryName: 'Mercado' })).toMatch(
      /^1 transação com a descrição “X” está em Mercado\./,
    );
  });
});

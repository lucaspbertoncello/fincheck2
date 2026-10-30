import { describe, expect, it } from 'vitest';

import {
  acceptRuleSuggestionRequestSchema,
  listRuleSuggestionsQuerySchema,
} from '#/categories/rule-suggestion/rule-suggestion.schema.ts';

describe('rule suggestion schemas', () => {
  it('lists with ids joined by commas, or with none', () => {
    expect(listRuleSuggestionsQuerySchema.safeParse({}).success).toBe(true);
    expect(listRuleSuggestionsQuerySchema.safeParse({ transactionIds: 'a,b' }).success).toBe(true);
    expect(listRuleSuggestionsQuerySchema.safeParse({ transactionIds: '' }).success).toBe(false);
  });

  it('accepts a suggestion with the history box answered', () => {
    const body = {
      pattern: 'UBER *TRIP',
      categoryId: '0194f3a0-0000-7000-8000-000000000001',
      applyToHistory: true,
    };
    expect(acceptRuleSuggestionRequestSchema.safeParse(body).success).toBe(true);
    expect(
      acceptRuleSuggestionRequestSchema.safeParse({
        pattern: body.pattern,
        categoryId: body.categoryId,
      }).success,
    ).toBe(false);
  });
});

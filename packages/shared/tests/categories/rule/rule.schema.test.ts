import { describe, expect, it } from 'vitest';

import {
  createRuleRequestSchema,
  previewRuleRequestSchema,
  updateRuleRequestSchema,
} from '#/categories/rule/rule.schema.ts';

describe('previewRuleRequestSchema', () => {
  it('normalizes the pattern', () => {
    expect(previewRuleRequestSchema.parse({ descriptionContains: ' uber  *trip ' })).toEqual({
      descriptionContains: 'UBER *TRIP',
    });
  });

  it('wants the normalized pattern between 2 and 100 characters', () => {
    expect(previewRuleRequestSchema.safeParse({ descriptionContains: 'a' }).success).toBe(false);
    expect(
      previewRuleRequestSchema.safeParse({ descriptionContains: 'x'.repeat(101) }).success,
    ).toBe(false);
  });

  it('keeps the maximum amount at or above the minimum', () => {
    const base = { descriptionContains: 'IFOOD' };
    expect(
      previewRuleRequestSchema.safeParse({ ...base, amountMinCents: 5000, amountMaxCents: 1000 })
        .success,
    ).toBe(false);
    expect(
      previewRuleRequestSchema.safeParse({ ...base, amountMinCents: 1000, amountMaxCents: 5000 })
        .success,
    ).toBe(true);
  });

  it('accepts at most 10 tags', () => {
    const tagIds = Array.from(
      { length: 11 },
      (_, index) => `0194f3a0-0000-7000-8000-${String(index).padStart(12, '0')}`,
    );
    expect(
      previewRuleRequestSchema.safeParse({ descriptionContains: 'IFOOD', tagIds }).success,
    ).toBe(false);
  });
});

describe('createRuleRequestSchema', () => {
  it('takes applyToHistory as a boolean', () => {
    expect(
      createRuleRequestSchema.safeParse({ descriptionContains: 'IFOOD', applyToHistory: true })
        .success,
    ).toBe(true);
    expect(
      createRuleRequestSchema.safeParse({ descriptionContains: 'IFOOD', applyToHistory: 'yes' })
        .success,
    ).toBe(false);
  });
});

describe('updateRuleRequestSchema', () => {
  it('needs a field and lets null clear a condition', () => {
    expect(updateRuleRequestSchema.safeParse({}).success).toBe(false);
    expect(updateRuleRequestSchema.safeParse({ kind: null, accountId: null }).success).toBe(true);
    expect(updateRuleRequestSchema.safeParse({ enabled: false }).success).toBe(true);
  });
});

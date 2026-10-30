import { describe, expect, it } from 'vitest';

import {
  centsSchema,
  nonNegativeCentsSchema,
  positiveCentsSchema,
} from '#/common/money/money.schema.ts';

describe('money schemas', () => {
  it('accepts integer cents, negative included', () => {
    expect(centsSchema.parse(-5280)).toBe(-5280);
    expect(centsSchema.parse(0)).toBe(0);
  });

  it('refuses fractions, text and non-finite numbers', () => {
    expect(centsSchema.safeParse(52.8).success).toBe(false);
    expect(centsSchema.safeParse('5280').success).toBe(false);
    expect(centsSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });

  it('positive refuses zero and negatives', () => {
    expect(positiveCentsSchema.safeParse(1).success).toBe(true);
    expect(positiveCentsSchema.safeParse(0).success).toBe(false);
    expect(positiveCentsSchema.safeParse(-1).success).toBe(false);
  });

  it('non-negative accepts zero', () => {
    expect(nonNegativeCentsSchema.safeParse(0).success).toBe(true);
    expect(nonNegativeCentsSchema.safeParse(-1).success).toBe(false);
  });
});
